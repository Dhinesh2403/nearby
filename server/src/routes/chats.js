// src/routes/chats.js
// One conversation per customer ↔ provider pair, persisted messages,
// unread counts, and a notification on each new conversation turn.
const router = require('express').Router();
const { Conversation, Message, Provider, User } = require('../models');
const { ok, fail } = require('../utils/helpers');
const { protect }  = require('../middleware/auth');

// Display name of the "other" participant for a conversation, from my POV
const otherNameOf = (conv, meId) => {
  // Support chats: the user sees "NearBy Support", the admin sees the user's name.
  if (conv.kind === 'support') {
    const iAmAdmin = conv.providerUserId?._id?.toString() === meId
                  || conv.providerUserId?.toString() === meId;
    return iAmAdmin ? (conv.customerId?.name || 'User') : 'NearBy Support';
  }
  const iAmCustomer = conv.customerId?._id?.toString() === meId
                   || conv.customerId?.toString() === meId;
  if (iAmCustomer) return conv.providerId?.businessName || 'Provider';
  return conv.customerId?.name || 'Customer';
};

// Find-or-create the conversation between the current user and the counterpart
const resolveConversation = async (user, { providerId, customerId }) => {
  if (user.role === 'customer') {
    if (!providerId) return { error: 'providerId is required.' };
    const provider = await Provider.findById(providerId);
    if (!provider) return { error: 'Provider not found.', status: 404 };
    const filter = { customerId: user._id, providerUserId: provider.userId };
    let conv = await Conversation.findOne(filter);
    if (!conv) conv = await Conversation.create({ ...filter, providerId: provider._id });
    return { conv };
  }
  // provider opening a chat with a customer
  const provider = await Provider.findOne({ userId: user._id });
  if (!provider) return { error: 'Create your provider profile first.', status: 400 };
  if (!customerId) return { error: 'customerId is required.' };
  const filter = { customerId, providerUserId: user._id };
  let conv = await Conversation.findOne(filter);
  if (!conv) conv = await Conversation.create({ ...filter, providerId: provider._id });
  return { conv };
};

// Works whether the ref is populated (a doc) or a raw ObjectId
const idStr = (v) => (v?._id ? v._id.toString() : v?.toString());
const isParticipant = (conv, meId) =>
  idStr(conv.customerId) === meId || idStr(conv.providerUserId) === meId;

// GET /api/chats — my conversations with last message + unread count
router.get('/', protect, async (req, res, next) => {
  try {
    const me = req.user._id.toString();
    const convs = await Conversation.find({
      $or: [{ customerId: req.user._id }, { providerUserId: req.user._id }],
    })
      .populate('customerId', 'name')
      .populate('providerId', 'businessName')
      .sort({ lastAt: -1, updatedAt: -1 });

    const list = await Promise.all(convs.map(async (c) => {
      const unread = await Message.countDocuments({
        conversationId: c._id, senderId: { $ne: req.user._id }, isRead: false,
      });
      return {
        _id:       c._id,
        otherName: otherNameOf(c, me),
        lastText:  c.lastText,
        lastAt:    c.lastAt,
        unread,
      };
    }));
    ok(res, list);
  } catch (e) { next(e); }
});

// GET /api/chats/unread-count — total unread across all my conversations
router.get('/unread-count', protect, async (req, res, next) => {
  try {
    const convs = await Conversation.find({
      $or: [{ customerId: req.user._id }, { providerUserId: req.user._id }],
    }).select('_id');
    const total = await Message.countDocuments({
      conversationId: { $in: convs.map(c => c._id) },
      senderId: { $ne: req.user._id },
      isRead: false,
    });
    ok(res, { total });
  } catch (e) { next(e); }
});

// POST /api/chats/open — find/create a conversation, returns its id
router.post('/open', protect, async (req, res, next) => {
  try {
    const { conv, error, status } = await resolveConversation(req.user, req.body);
    if (error) return fail(res, error, status || 400);
    const populated = await Conversation.findById(conv._id)
      .populate('customerId', 'name').populate('providerId', 'businessName');
    ok(res, { _id: conv._id, otherName: otherNameOf(populated, req.user._id.toString()) });
  } catch (e) { next(e); }
});

// POST /api/chats/support — open (find-or-create) a support conversation.
// A customer/provider reaches the platform admin; an admin reaches a chosen user.
router.post('/support', protect, async (req, res, next) => {
  try {
    let targetId, adminId;
    if (req.user.role === 'admin') {
      targetId = req.body.userId;
      if (!targetId) return fail(res, 'userId is required.');
      adminId = req.user._id;
    } else {
      const admin = await User.findOne({ role: 'admin' }).select('_id');
      if (!admin) return fail(res, 'No admin is available right now.', 503);
      targetId = req.user._id;
      adminId  = admin._id;
    }
    if (targetId.toString() === adminId.toString())
      return fail(res, 'Cannot open a support chat with yourself.');

    const filter = { customerId: targetId, providerUserId: adminId, kind: 'support' };
    let conv = await Conversation.findOne(filter);
    if (!conv) conv = await Conversation.create(filter);
    const populated = await Conversation.findById(conv._id).populate('customerId', 'name');
    ok(res, { _id: conv._id, otherName: otherNameOf(populated, req.user._id.toString()) });
  } catch (e) { next(e); }
});

// GET /api/chats/:id/messages — history (marks incoming as read)
router.get('/:id/messages', protect, async (req, res, next) => {
  try {
    const conv = await Conversation.findById(req.params.id)
      .populate('customerId', 'name').populate('providerId', 'businessName');
    if (!conv) return fail(res, 'Conversation not found.', 404);
    const me = req.user._id.toString();
    if (req.user.role !== 'admin' && !isParticipant(conv, me))
      return fail(res, 'Not authorised for this conversation.', 403);

    const upd = await Message.updateMany(
      { conversationId: conv._id, senderId: { $ne: req.user._id }, isRead: false },
      { isRead: true }
    );
    // Let the other participant's open thread show "Seen" live
    if (upd.modifiedCount > 0) {
      const io = req.app.locals.io;
      if (io) io.to(conv._id.toString()).emit('messages_seen', { by: me });
    }
    const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 });
    ok(res, { messages, otherName: otherNameOf(conv, me) });
  } catch (e) { next(e); }
});

// POST /api/chats/:id/messages — send a message (text and/or image)
router.post('/:id/messages', protect, async (req, res, next) => {
  try {
    const { text, image } = req.body;
    if (!text?.trim() && !image) return fail(res, 'A message or image is required.');

    const conv = await Conversation.findById(req.params.id);
    if (!conv) return fail(res, 'Conversation not found.', 404);
    const me = req.user._id.toString();
    if (!isParticipant(conv, me)) return fail(res, 'Not authorised.', 403);

    const msg = await Message.create({
      conversationId: conv._id, senderId: req.user._id, senderName: req.user.name,
      text: (text || '').trim(), image: image || '',
    });

    conv.lastText = (text || '').trim().slice(0, 120) || '📷 Photo';
    conv.lastSenderId = req.user._id;
    conv.lastAt = new Date();
    await conv.save();

    const io = req.app.locals.io;
    if (io) {
      // Deliver the saved message to anyone viewing the conversation (instant, incl. image)
      io.to(conv._id.toString()).emit('receive_message', {
        _id: msg._id.toString(), conversationId: conv._id.toString(),
        senderId: me, senderName: req.user.name,
        text: msg.text, image: msg.image, createdAt: msg.createdAt,
      });
      // Badge nudge to the recipient's personal room (no bell notification)
      const recipientId = conv.customerId.toString() === me
        ? conv.providerUserId.toString()
        : conv.customerId.toString();
      if (recipientId) io.notifyUser(recipientId, 'chat:new', {
        conversationId: conv._id.toString(),
        from: req.user.name,
        preview: msg.text ? msg.text.slice(0, 60) : '📷 Photo',
      });
    }

    res.status(201).json({ success: true, message: 'Sent.', data: msg });
  } catch (e) { next(e); }
});

module.exports = router;
