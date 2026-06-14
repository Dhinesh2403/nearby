// src/models/index.js
// All Mongoose schemas exported from one place for easy import
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

// ─── USER ─────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:         { type: String, required: true, unique: true },
  passwordHash:  { type: String, required: true, select: false },
  role:          { type: String, enum: ['customer','provider','admin'], default: 'customer' },
  avatar:        { type: String, default: '' },
  isActive:      { type: Boolean, default: true },
  refreshToken:  { type: String, select: false },
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [80.2707, 13.0827] },
    address:     { type: String, default: '' },
    district:    { type: String, default: '', index: true },   // primary medium for offline matching
    area:        { type: String, default: '' },                // location / locality name
    city:        { type: String, default: 'Chennai' },
    pincode:     { type: String, default: '' },
  },
}, { timestamps: true });

UserSchema.index({ location: '2dsphere' });

// Hash password before save (only when passwordHash was set/changed)
UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

UserSchema.methods.isPasswordCorrect = function (plain, hash) {
  return bcrypt.compare(plain, hash);
};

const User = mongoose.model('User', UserSchema);

// ─── PROVIDER ─────────────────────────────────────────────────
const ProviderSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  businessName: { type: String, required: true, trim: true },
  tagline:      { type: String, default: '', maxlength: 120 },
  bio:          { type: String, default: '', maxlength: 500 },
  category:     { type: String, required: true, enum: ['home_services','education','food','wellness','events'] },
  subCategory:  { type: String, default: '' },
  skills:       [{ type: String }],
  images:       [{ type: String }],
  experience:   { type: Number, default: 0 },
  isVerified:   { type: Boolean, default: false },
  isOnline:     { type: Boolean, default: false },
  availability: {
    days:      { type: [String], default: ['Mon','Tue','Wed','Thu','Fri'] },
    startTime: { type: String, default: '09:00' },
    endTime:   { type: String, default: '18:00' },
  },
  serviceRadius: { type: Number, default: 10 },
  ratingAvg:     { type: Number, default: 0 },
  ratingCount:   { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },
  price:         { type: Number, default: 0 },   // starting / min price
  priceMax:      { type: Number, default: 0 },   // upper end of range (0 = single price)
  planType:      { type: String, enum: ['free','basic','pro'], default: 'free' },
  status:        { type: String, enum: ['pending','active','suspended'], default: 'pending' },
}, { timestamps: true });

ProviderSchema.index({ category: 1, status: 1 });
ProviderSchema.index({ ratingAvg: -1 });

const Provider = mongoose.model('Provider', ProviderSchema);

// ─── SERVICE ──────────────────────────────────────────────────
const ServiceSchema = new mongoose.Schema({
  providerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
  title:        { type: String, required: true, trim: true },
  description:  { type: String, required: true },
  category:     { type: String, required: true },
  subCategory:  { type: String, default: '' },
  deliveryType: { type: String, enum: ['in_person','remote','both'], default: 'in_person' },
  priceType:    { type: String, enum: ['fixed','hourly','negotiable'], default: 'fixed' },
  price:        { type: Number, default: 0 },
  currency:     { type: String, default: 'INR' },
  duration:     { type: Number, default: 60 },
  tags:         [{ type: String }],
  images:       [{ type: String }],
  isActive:     { type: Boolean, default: true },
  viewCount:    { type: Number, default: 0 },
}, { timestamps: true });

const Service = mongoose.model('Service', ServiceSchema);

// ─── BOOKING ──────────────────────────────────────────────────
const BookingSchema = new mongoose.Schema({
  customerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
  serviceId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  bookingType:   { type: String, enum: ['in_person','remote'], default: 'in_person' },
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true },
  address:       { type: String, default: '' },
  meetingLink:   { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending','accepted','rejected','in_progress','completed','cancelled'],
    default: 'pending',
  },
  totalAmount:   { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['unpaid','paid','refunded'], default: 'unpaid' },
  notes:         { type: String, default: '' },
  cancelReason:  { type: String, default: '' },
  rejectReason:  { type: String, default: '' },
  completedAt:   { type: Date },
}, { timestamps: true });

BookingSchema.index({ customerId: 1, status: 1 });
BookingSchema.index({ providerId: 1, status: 1 });

const Booking = mongoose.model('Booking', BookingSchema);

// ─── REVIEW ───────────────────────────────────────────────────
const ReviewSchema = new mongoose.Schema({
  bookingId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  customerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
  rating:        { type: Number, required: true, min: 1, max: 5 },
  review:        { type: String, default: '', maxlength: 500 },
  images:        [{ type: String }],
  tags:          [{ type: String }],
  providerReply: { type: String, default: '' },
  isVisible:     { type: Boolean, default: true },
}, { timestamps: true });

ReviewSchema.index({ providerId: 1, createdAt: -1 });

const Review = mongoose.model('Review', ReviewSchema);

// ─── COMPLAINT ────────────────────────────────────────────────
const ComplaintSchema = new mongoose.Schema({
  raisedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  against:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookingId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  type:        { type: String, enum: ['no_show','quality','fraud','behaviour','other'], required: true },
  description: { type: String, required: true, maxlength: 1000 },
  evidence:    [{ type: String }],
  status:      { type: String, enum: ['open','investigating','resolved','closed'], default: 'open' },
  resolution:  { type: String, default: '' },
  resolvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt:  { type: Date, default: null },
}, { timestamps: true });

ComplaintSchema.index({ status: 1 });
ComplaintSchema.index({ raisedBy: 1 });

const Complaint = mongoose.model('Complaint', ComplaintSchema);

// ─── NOTIFICATION ─────────────────────────────────────────────
const NotificationSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:    { type: String, required: true },
  title:   { type: String, required: true },
  body:    { type: String, required: true },
  link:    { type: String, default: '' },
  isRead:  { type: Boolean, default: false },
}, { timestamps: true });

NotificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.model('Notification', NotificationSchema);

// ─── CONVERSATION (unique per customer ↔ provider pair) ───────
const ConversationSchema = new mongoose.Schema({
  customerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  providerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  providerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
  lastText:       { type: String, default: '' },
  lastSenderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastAt:         { type: Date },
}, { timestamps: true });

// One conversation per (customer, provider) pair
ConversationSchema.index({ customerId: 1, providerUserId: 1 }, { unique: true });

const Conversation = mongoose.model('Conversation', ConversationSchema);

// ─── MESSAGE ──────────────────────────────────────────────────
const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName:     { type: String, required: true },
  text:           { type: String, default: '', maxlength: 2000 },
  image:          { type: String, default: '' },   // data URL (e.g. payment screenshot)
  isRead:         { type: Boolean, default: false },
}, { timestamps: true });

MessageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.model('Message', MessageSchema);

module.exports = { User, Provider, Service, Booking, Review, Complaint, Notification, Conversation, Message };
