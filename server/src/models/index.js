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
  hasPassword:   { type: Boolean, default: false },
  role:          { type: String, enum: ['customer','provider','admin'], default: 'customer' },
  avatar:        { type: String, default: '' },
  isActive:      { type: Boolean, default: true },
  isDemo:        { type: Boolean, default: false, index: true },  // internal test account — hidden from real users
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
  category: {
    type: String,
    required: true,
    enum: [
      'home_services', 'cleaning', 'repair_services',
      'education', 'music_arts',
      'food', 'bakery',
      'beauty_salon', 'wellness', 'fitness', 'health_medical',
      'events', 'photography', 'wedding',
      'automotive', 'clothing_fashion', 'pet_care',
      'transport', 'interior_design', 'it_tech', 'legal_finance',
      'childcare', 'sports', 'printing', 'security', 'agriculture',
    ],
  },
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
  price:         { type: Number, default: 0 },   // starting / min price
  priceMax:      { type: Number, default: 0 },   // upper end of range (0 = single price)
  planType:      { type: String, enum: ['free','basic','pro'], default: 'free' },
  status:        { type: String, enum: ['pending','active','suspended'], default: 'pending' },
  banReason:     { type: String, default: '' },   // set when admin suspends (5.8/5.9)
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

// ─── REVIEW ───────────────────────────────────────────────────
const ReviewSchema = new mongoose.Schema({
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

// ─── CONTACT LOG (call / WhatsApp handoff tracking) ───────────
// Records that a customer revealed a provider's contact details and
// via which channel. Powers provider stats + "Who Visited" later.
const ContactLogSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
  channel:    { type: String, enum: ['call', 'whatsapp'], required: true },
}, { timestamps: true });

ContactLogSchema.index({ providerId: 1, createdAt: -1 });
ContactLogSchema.index({ customerId: 1, providerId: 1 });

const ContactLog = mongoose.model('ContactLog', ContactLogSchema);

// ─── PROFILE VIEW (who visited a provider profile) ────────────
// guestId is set for not-logged-in visitors (a client-generated id),
// customerId for logged-in customers. Powers view counts + "Who Visited".
const ProfileViewSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  guestId:    { type: String, default: '' },
}, { timestamps: true });

ProfileViewSchema.index({ providerId: 1, createdAt: -1 });

const ProfileView = mongoose.model('ProfileView', ProfileViewSchema);

// ─── AD REWARD (rewarded-ad completions, server-verified) ─────
// Tracks each completed rewarded ad. Once a provider accumulates the
// configured number, the latest visitor batch is unlocked.
const AdRewardSchema = new mongoose.Schema({
  providerId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
  adType:              { type: String, enum: ['rewarded'], default: 'rewarded' },
  completedAt:         { type: Date, default: Date.now },
  unlockedVisitorBatch:{ type: Boolean, default: false },
}, { timestamps: true });

AdRewardSchema.index({ providerId: 1, createdAt: -1 });

const AdReward = mongoose.model('AdReward', AdRewardSchema);

// ─── APP SETTINGS (singleton — global platform toggles) ───────
// One document holds all admin-controlled switches. Use
// AppSettings.getSingleton() to read-or-create it.
const AppSettingsSchema = new mongoose.Schema({
  key:                 { type: String, default: 'global', unique: true },  // always 'global'
  otpEnabled:          { type: Boolean, default: true },   // customer + provider OTP
  otpCustomerEnabled:  { type: Boolean, default: true },
  otpProviderEnabled:  { type: Boolean, default: true },
  adsEnabled:          { type: Boolean, default: true },   // banner + rewarded master switch
  rewardedAdsEnabled:  { type: Boolean, default: true },
  whoVisitedEnabled:   { type: Boolean, default: true },
  adsRequiredCount:    { type: Number,  default: 2 },      // ads to unlock visitor list
  registrationsEnabled:{ type: Boolean, default: true },   // freeze new provider signups
  complaintsEnabled:   { type: Boolean, default: true },
  featuredCategories:  { type: [String], default: [] },    // homepage promoted categories
  bannerAdUnitId:      { type: String, default: '' },      // AdMob (Phase 6)
  rewardedAdUnitId:    { type: String, default: '' },
  announcement: {
    active: { type: Boolean, default: false },
    text:   { type: String, default: '' },
  },
}, { timestamps: true });

AppSettingsSchema.statics.getSingleton = async function () {
  let s = await this.findOne({ key: 'global' });
  if (!s) s = await this.create({ key: 'global' });
  return s;
};

const AppSettings = mongoose.model('AppSettings', AppSettingsSchema);

// ─── ADMIN LOG (audit trail — who changed what, when) ─────────
const AdminLogSchema = new mongoose.Schema({
  adminId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminName: { type: String, default: '' },
  action:    { type: String, required: true },   // e.g. 'ban_provider', 'update_settings'
  detail:    { type: String, default: '' },
}, { timestamps: true });

AdminLogSchema.index({ createdAt: -1 });

const AdminLog = mongoose.model('AdminLog', AdminLogSchema);

// ─── LEAD (quick enquiry from results-page sidebar form) ──────
const LeadSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  mobile:   { type: String, required: true },
  service:  { type: String, default: '' },
  location: { type: String, default: '' },
  status:   { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
}, { timestamps: true });

const Lead = mongoose.model('Lead', LeadSchema);

module.exports = { User, Provider, Service, Review, Complaint, Notification, Conversation, Message, ContactLog, ProfileView, AdReward, AppSettings, AdminLog, Lead };
