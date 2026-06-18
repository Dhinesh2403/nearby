// src/routes/categories.js
// Serves service-category metadata (icon, colour, image, sub-categories)
// so the frontend doesn't hard-code it. Includes a live provider count
// per category. Public — no auth required.
const router = require('express').Router();
const { Provider, AppSettings } = require('../models');
const { ok } = require('../utils/helpers');

// Canonical category metadata. Keep `id` in sync with the Provider schema enum.
const CATEGORIES = [
  { id: 'home_services',    label: 'Home Services',      icon: 'bi-tools',            color: '#2563A8',
    image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400',
    subCategories: ['Plumber', 'Electrician', 'Carpenter', 'Painter', 'Mason', 'Handyman', 'Waterproofing', 'Tile Work'] },

  { id: 'cleaning',         label: 'Cleaning Services',  icon: 'bi-house-check',      color: '#0369A1',
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400',
    subCategories: ['House Cleaning', 'Kitchen Deep Clean', 'Bathroom Cleaning', 'Sofa Cleaning', 'Carpet Cleaning', 'Pest Control', 'Disinfection'] },

  { id: 'repair_services',  label: 'Repair Services',    icon: 'bi-wrench-adjustable', color: '#6B7280',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
    subCategories: ['Mobile Repair', 'Laptop Repair', 'TV Repair', 'AC Repair', 'Refrigerator Repair', 'Washing Machine Repair', 'Inverter & Battery', 'RO Water Purifier'] },

  { id: 'education',        label: 'Education & Tutoring', icon: 'bi-mortarboard',    color: '#059669',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
    subCategories: ['Maths Tutor', 'Science Tutor', 'English Tutor', 'Hindi Tutor', 'Coding Classes', 'Drawing Classes', 'Chess Coaching', 'Abacus', 'IELTS / TOEFL', 'Spoken English'] },

  { id: 'music_arts',       label: 'Music & Arts',       icon: 'bi-music-note-beamed', color: '#0F766E',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
    subCategories: ['Guitar', 'Keyboard', 'Violin', 'Carnatic Music', 'Dance Classes', 'Bharatanatyam', 'Drawing & Painting', 'Craft Classes', 'Pottery'] },

  { id: 'food',             label: 'Food & Catering',    icon: 'bi-basket2',          color: '#D97706',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    subCategories: ['Tiffin Service', 'Meal Subscription', 'Home Cook', 'Catering Service', 'Biryani Catering', 'Veg Catering', 'Non-Veg Catering', 'Pickles & Homemade Food', 'Diet Food', 'Corporate Catering'] },

  { id: 'bakery',           label: 'Bakery & Sweet Shops', icon: 'bi-cake2',          color: '#B45309',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
    subCategories: ['Custom Cakes', 'Birthday Cakes', 'Wedding Cakes', 'Cupcakes', 'Cookies & Brownies', 'Chocolates', 'Mithai & Sweets', 'Bread & Buns', 'Snacks & Namkeen'] },

  { id: 'beauty_salon',     label: 'Beauty & Salon',     icon: 'bi-scissors',         color: '#DB2777',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
    subCategories: ['Hair Cutting', 'Hair Colouring', 'Straightening & Smoothening', 'Facial & Cleanup', 'Waxing', 'Eyebrow Threading', 'Nail Art', 'Bleach & D-Tan', 'Keratin Treatment'] },

  { id: 'wellness',         label: 'Spa & Massage',      icon: 'bi-heart-pulse',      color: '#7C3AED',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
    subCategories: ['Body Massage', 'Head Massage', 'Foot Massage', 'Spa Package', 'Aromatherapy', 'Thai Massage', 'Couple Spa', 'Physiotherapy', 'Chiropractic'] },

  { id: 'fitness',          label: 'Fitness & Gym',      icon: 'bi-bicycle',          color: '#0891B2',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400',
    subCategories: ['Personal Trainer', 'Yoga', 'Zumba', 'Aerobics', 'Pilates', 'CrossFit', 'Gym Membership', 'Online Fitness Coach', 'Weight Loss Coach', 'Meditation'] },

  { id: 'health_medical',   label: 'Health & Medical',   icon: 'bi-hospital',         color: '#0F766E',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400',
    subCategories: ['Nurse at Home', 'Dietitian & Nutritionist', 'Physiotherapist', 'Ayurveda', 'Homeopathy', 'Acupuncture', 'Elder Care', 'Home Blood Test', 'Dental (Home Visit)', 'Counselling & Therapy'] },

  { id: 'events',           label: 'Events & Decoration', icon: 'bi-balloon-heart',   color: '#DC2626',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400',
    subCategories: ['Birthday Decoration', 'Party Planner', 'DJ Services', 'Sound System', 'Tent & Mandap', 'Flower Decoration', 'Balloon Decoration', 'Stage Decoration', 'Caricature Artist', 'Magic Show'] },

  { id: 'photography',      label: 'Photography & Video', icon: 'bi-camera',          color: '#7C3AED',
    image: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=400',
    subCategories: ['Wedding Photography', 'Baby Shoot', 'Product Photography', 'Corporate Photography', 'Videography', 'Drone Shoot', 'Photo Editing', 'Maternity Shoot', 'Pre-Wedding Shoot'] },

  { id: 'wedding',          label: 'Wedding Services',   icon: 'bi-suit-heart',       color: '#9333EA',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
    subCategories: ['Wedding Planner', 'Bridal Makeup', 'Mehndi Artist', 'Wedding Photography', 'Jewellery Rental', 'Bridal Wear', 'Invitation Cards', 'Wedding Catering', 'Horse & Buggy', 'Band & Baaja'] },

  { id: 'automotive',       label: 'Automotive Services', icon: 'bi-car-front',       color: '#1D4ED8',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400',
    subCategories: ['Car Service', 'Bike Service', 'Car Wash', 'Denting & Painting', 'Tyre Puncture', 'Auto Mechanic', 'Driving School', 'Car AC Repair', 'Battery Replacement', 'Car Cleaning'] },

  { id: 'clothing_fashion', label: 'Clothing & Fashion', icon: 'bi-bag-heart',        color: '#BE185D',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400',
    subCategories: ['Tailor', 'Blouse Stitching', 'Boutique', 'Embroidery', 'Lehenga Stitching', 'Saree Blouse', 'Kids Clothing', 'Laundry', 'Dry Cleaning', 'Fabric Printing'] },

  { id: 'pet_care',         label: 'Pet Care',           icon: 'bi-heart',            color: '#92400E',
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
    subCategories: ['Dog Grooming', 'Cat Grooming', 'Pet Boarding', 'Dog Walker', 'Vet at Home', 'Pet Training', 'Aquarium Cleaning', 'Bird Care'] },

  { id: 'transport',        label: 'Transport & Logistics', icon: 'bi-truck',         color: '#374151',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400',
    subCategories: ['Packers & Movers', 'Mini Tempo', 'Load Auto', 'House Shifting', 'Office Shifting', 'Courier Service', 'Car Transport', 'Bike Transport'] },

  { id: 'interior_design',  label: 'Interior Design',    icon: 'bi-brush',            color: '#B45309',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400',
    subCategories: ['Interior Designer', 'Modular Kitchen', 'Wardrobe & Furniture', 'False Ceiling', 'Curtains & Blinds', 'Wall Painting & Art', 'Vastu Consultant', 'Furniture Repair', 'Sofa Repair'] },

  { id: 'it_tech',          label: 'IT & Technology',    icon: 'bi-laptop',           color: '#1D4ED8',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400',
    subCategories: ['Web Developer', 'App Developer', 'Computer Repair', 'Data Recovery', 'CCTV Installation', 'Networking & WiFi', 'Printer Repair', 'Graphic Designer', 'Social Media Manager', 'Digital Marketing'] },

  { id: 'legal_finance',    label: 'Legal & Finance',    icon: 'bi-briefcase',        color: '#1E40AF',
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400',
    subCategories: ['Chartered Accountant', 'Tax Filing', 'GST Registration', 'Company Registration', 'Lawyer', 'Notary', 'Property Documents', 'Loan Consultant', 'Insurance Agent', 'Financial Planner'] },

  { id: 'childcare',        label: 'Childcare',          icon: 'bi-emoji-smile',      color: '#D97706',
    image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400',
    subCategories: ['Babysitter', 'Nanny', 'Creche', 'Daycare', 'After School Care', 'Special Needs Support'] },

  { id: 'sports',           label: 'Sports & Coaching',  icon: 'bi-trophy',           color: '#16A34A',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    subCategories: ['Cricket Coaching', 'Football Coaching', 'Tennis', 'Badminton', 'Swimming', 'Kabaddi', 'Athletics', 'Martial Arts', 'Self Defence', 'Skating'] },

  { id: 'printing',         label: 'Printing & Stationery', icon: 'bi-printer',       color: '#6B7280',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400',
    subCategories: ['Visiting Cards', 'Banners & Flex', 'Brochures', 'Wedding Invitations', 'T-Shirt Printing', 'Gift Printing', 'Photo Printing', 'Stickers & Labels'] },

  { id: 'security',         label: 'Security Services',  icon: 'bi-shield-check',     color: '#374151',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    subCategories: ['Security Guard', 'CCTV Installation', 'Alarm System', 'Door Lock Repair', 'Safe Installation', 'Biometric System'] },

  { id: 'agriculture',      label: 'Agriculture & Organic', icon: 'bi-tree',          color: '#15803D',
    image: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=400',
    subCategories: ['Organic Vegetables', 'Organic Fruits', 'Farm Fresh Eggs', 'Dairy Products', 'Vermicompost', 'Farm Worker', 'Tractor Service', 'Irrigation System'] },
];

// GET /api/categories — metadata + live active-provider counts + featured flags
router.get('/', async (req, res, next) => {
  try {
    const [counts, settings] = await Promise.all([
      Provider.aggregate([
        { $match: { status: 'active', isVerified: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      AppSettings.getSingleton(),
    ]);
    const countMap = Object.fromEntries(counts.map(c => [c._id, c.count]));
    const featured = settings.featuredCategories || [];

    const data = CATEGORIES.map(c => ({
      ...c,
      count: countMap[c.id] || 0,
      featured: featured.includes(c.id),
    }));
    ok(res, data);
  } catch (e) { next(e); }
});

module.exports = router;
