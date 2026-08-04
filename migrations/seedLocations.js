import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LocationMaster from '../src/shared/models/LocationMaster.js';

dotenv.config();

const locations = [
  // Uttar Pradesh Districts
  { city: 'Lucknow', state: 'Uttar Pradesh', district: 'Lucknow', minLatitude: 26.70, maxLatitude: 27.00, minLongitude: 80.75, maxLongitude: 81.15, pinCodes: ['226001', '226002', '226003', '226004', '226005', '226006', '226010', '226012', '226016', '226017', '226018', '226019', '226020', '226021', '226022', '226023', '226024', '226025', '226026'] },
  { city: 'Kanpur', state: 'Uttar Pradesh', district: 'Kanpur Nagar', minLatitude: 26.30, maxLatitude: 26.60, minLongitude: 80.20, maxLongitude: 80.50, pinCodes: ['208001', '208002', '208003', '208004', '208005', '208006', '208007', '208010', '208011', '208012', '208013', '208014', '208015', '208016', '208017', '208019', '208020', '208021', '208022', '208023', '208024', '208025', '208026', '208027'] },
  { city: 'Agra', state: 'Uttar Pradesh', district: 'Agra', minLatitude: 26.95, maxLatitude: 27.30, minLongitude: 77.85, maxLongitude: 78.20, pinCodes: ['282001', '282002', '282003', '282004', '282005', '282006', '282007', '282008', '282009', '282010'] },
  { city: 'Varanasi', state: 'Uttar Pradesh', district: 'Varanasi', minLatitude: 25.20, maxLatitude: 25.45, minLongitude: 82.85, maxLongitude: 83.10, pinCodes: ['221001', '221002', '221003', '221004', '221005', '221006', '221007', '221008', '221009', '221010', '221011'] },
  { city: 'Prayagraj', state: 'Uttar Pradesh', district: 'Prayagraj', minLatitude: 25.30, maxLatitude: 25.60, minLongitude: 81.70, maxLongitude: 82.00, pinCodes: ['211001', '211002', '211003', '211004', '211005', '211006', '211007', '211008', '211009', '211010', '211011', '211012', '211013', '211014', '211015', '211016', '211017', '211018', '211019', '211021', '211022', '211023'] },
  { city: 'Gorakhpur', state: 'Uttar Pradesh', district: 'Gorakhpur', minLatitude: 26.60, maxLatitude: 26.90, minLongitude: 83.25, maxLongitude: 83.55, pinCodes: ['273001', '273002', '273003', '273004', '273005', '273006', '273007', '273008', '273009', '273010', '273012', '273013', '273014', '273015', '273016', '273017'] },
  { city: 'Noida', state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', minLatitude: 28.40, maxLatitude: 28.70, minLongitude: 77.25, maxLongitude: 77.55, pinCodes: ['201301', '201302', '201303', '201304', '201305', '201306', '201307', '201308', '201309', '201310', '201311', '201312', '201313', '201314', '201315', '201316', '201317', '201318', '201319'] },
  { city: 'Ghaziabad', state: 'Uttar Pradesh', district: 'Ghaziabad', minLatitude: 28.55, maxLatitude: 28.80, minLongitude: 77.35, maxLongitude: 77.60, pinCodes: ['201001', '201002', '201003', '201004', '201005', '201006', '201007', '201008', '201009', '201010', '201011', '201012', '201013', '201014', '201015', '201016', '201017', '201018', '201019', '201020', '201021'] },
  { city: 'Meerut', state: 'Uttar Pradesh', district: 'Meerut', minLatitude: 28.90, maxLatitude: 29.10, minLongitude: 77.60, maxLongitude: 77.85, pinCodes: ['250001', '250002', '250003', '250004', '250005', '250006', '250007', '250008', '250009', '250010', '250011', '250012', '250013', '250014', '250015', '250016', '250017', '250018', '250019', '250020', '250021', '250022'] },
  { city: 'Mathura', state: 'Uttar Pradesh', district: 'Mathura', minLatitude: 27.40, maxLatitude: 27.65, minLongitude: 77.55, maxLongitude: 77.80, pinCodes: ['281001', '281002', '281003', '281004', '281005', '281006'] },
  { city: 'Aligarh', state: 'Uttar Pradesh', district: 'Aligarh', minLatitude: 27.75, maxLatitude: 28.00, minLongitude: 78.00, maxLongitude: 78.25, pinCodes: ['202001', '202002', '202003', '202004', '202005', '202006', '202007', '202008', '202009', '202010'] },
  { city: 'Bareilly', state: 'Uttar Pradesh', district: 'Bareilly', minLatitude: 28.25, maxLatitude: 28.50, minLongitude: 79.30, maxLongitude: 79.55, pinCodes: ['243001', '243002', '243003', '243004', '243005', '243006'] },
  { city: 'Moradabad', state: 'Uttar Pradesh', district: 'Moradabad', minLatitude: 28.75, maxLatitude: 29.00, minLongitude: 78.70, maxLongitude: 78.95, pinCodes: ['244001', '244002', '244003', '244004', '244005', '244006'] },
  { city: 'Saharanpur', state: 'Uttar Pradesh', district: 'Saharanpur', minLatitude: 29.85, maxLatitude: 30.10, minLongitude: 77.50, maxLongitude: 77.75, pinCodes: ['247001', '247002', '247003', '247004', '247005', '247006'] },
  { city: 'Firozabad', state: 'Uttar Pradesh', district: 'Firozabad', minLatitude: 27.10, maxLatitude: 27.30, minLongitude: 78.35, maxLongitude: 78.55, pinCodes: ['283201', '283202', '283203'] },
  { city: 'Jhansi', state: 'Uttar Pradesh', district: 'Jhansi', minLatitude: 25.35, maxLatitude: 25.55, minLongitude: 78.45, maxLongitude: 78.65, pinCodes: ['284001', '284002', '284003', '284004', '284005', '284006'] },
  { city: 'Muzaffarnagar', state: 'Uttar Pradesh', district: 'Muzaffarnagar', minLatitude: 29.40, maxLatitude: 29.60, minLongitude: 77.60, maxLongitude: 77.80, pinCodes: ['251001', '251002', '251003'] },
  { city: 'Shahjahanpur', state: 'Uttar Pradesh', district: 'Shahjahanpur', minLatitude: 27.80, maxLatitude: 28.00, minLongitude: 79.85, maxLongitude: 80.05, pinCodes: ['242001', '242002', '242003'] },
  { city: 'Rampur', state: 'Uttar Pradesh', district: 'Rampur', minLatitude: 28.75, maxLatitude: 28.95, minLongitude: 79.00, maxLongitude: 79.20, pinCodes: ['244901', '244902', '244903'] },
  { city: 'Shrawasti', state: 'Uttar Pradesh', district: 'Shrawasti', minLatitude: 27.50, maxLatitude: 27.90, minLongitude: 81.80, maxLongitude: 82.20, pinCodes: ['271831', '271835', '271840', '271845', '271851', '271855', '271861', '271865'] },
  { city: 'Ikauna', state: 'Uttar Pradesh', district: 'Shrawasti', minLatitude: 27.50, maxLatitude: 27.90, minLongitude: 81.80, maxLongitude: 82.20, pinCodes: ['271831', '271835'] },
  { city: 'Bahraich', state: 'Uttar Pradesh', district: 'Bahraich', minLatitude: 27.50, maxLatitude: 27.80, minLongitude: 81.50, maxLongitude: 81.80, pinCodes: ['271801', '271802', '271803', '271804', '271805', '271806', '271807', '271808', '271809', '271810'] },
  { city: 'Balrampur', state: 'Uttar Pradesh', district: 'Balrampur', minLatitude: 27.35, maxLatitude: 27.65, minLongitude: 82.05, maxLongitude: 82.35, pinCodes: ['271201', '271202', '271203', '271204', '271205', '271206', '271207', '271208', '271209', '271210'] },
  { city: 'Gonda', state: 'Uttar Pradesh', district: 'Gonda', minLatitude: 27.05, maxLatitude: 27.35, minLongitude: 81.85, maxLongitude: 82.15, pinCodes: ['271001', '271002', '271003', '271004', '271005', '271006', '271007', '271008', '271009', '271010'] },
  { city: 'Faizabad', state: 'Uttar Pradesh', district: 'Ayodhya', minLatitude: 26.65, maxLatitude: 26.90, minLongitude: 82.00, maxLongitude: 82.25, pinCodes: ['224001', '224002', '224003', '224004', '224005', '224006', '224007', '224008', '224009', '224010'] },
  { city: 'Ayodhya', state: 'Uttar Pradesh', district: 'Ayodhya', minLatitude: 26.65, maxLatitude: 26.90, minLongitude: 82.00, maxLongitude: 82.25, pinCodes: ['224001', '224002', '224003', '224004', '224005', '224006', '224007', '224008', '224009', '224010'] },
  { city: 'Sultanpur', state: 'Uttar Pradesh', district: 'Sultanpur', minLatitude: 26.20, maxLatitude: 26.45, minLongitude: 82.00, maxLongitude: 82.25, pinCodes: ['228001', '228002', '228003', '228004', '228005', '228006', '228007', '228008', '228009', '228010'] },
  { city: 'Raebareli', state: 'Uttar Pradesh', district: 'Raebareli', minLatitude: 26.10, maxLatitude: 26.35, minLongitude: 81.10, maxLongitude: 81.35, pinCodes: ['229001', '229002', '229003', '229004', '229005', '229006', '229007', '229008', '229009', '229010'] },
  { city: 'Sitapur', state: 'Uttar Pradesh', district: 'Sitapur', minLatitude: 27.45, maxLatitude: 27.70, minLongitude: 80.60, maxLongitude: 80.85, pinCodes: ['261001', '261002', '261003', '261004', '261005', '261006', '261007', '261008', '261009', '261010'] },
  { city: 'Hardoi', state: 'Uttar Pradesh', district: 'Hardoi', minLatitude: 27.30, maxLatitude: 27.55, minLongitude: 80.05, maxLongitude: 80.30, pinCodes: ['241001', '241002', '241003', '241004', '241005', '241006', '241007', '241008', '241009', '241010'] },
  { city: 'Lakhimpur Kheri', state: 'Uttar Pradesh', district: 'Lakhimpur Kheri', minLatitude: 27.80, maxLatitude: 28.10, minLongitude: 80.65, maxLongitude: 80.95, pinCodes: ['262701', '262702', '262703', '262704', '262705', '262706', '262707', '262708', '262709', '262710'] },
  { city: 'Basti', state: 'Uttar Pradesh', district: 'Basti', minLatitude: 26.65, maxLatitude: 26.90, minLongitude: 82.65, maxLongitude: 82.90, pinCodes: ['272001', '272002', '272003', '272004', '272005', '272006', '272007', '272008', '272009', '272010'] },
  { city: 'Azamgarh', state: 'Uttar Pradesh', district: 'Azamgarh', minLatitude: 26.00, maxLatitude: 26.25, minLongitude: 83.10, maxLongitude: 83.35, pinCodes: ['276001', '276002', '276003', '276004', '276005', '276006', '276007', '276008', '276009', '276010'] },
  { city: 'Jaunpur', state: 'Uttar Pradesh', district: 'Jaunpur', minLatitude: 25.65, maxLatitude: 25.90, minLongitude: 82.60, maxLongitude: 82.85, pinCodes: ['222001', '222002', '222003', '222004', '222005', '222006', '222007', '222008', '222009', '222010'] },
  { city: 'Mirzapur', state: 'Uttar Pradesh', district: 'Mirzapur', minLatitude: 25.05, maxLatitude: 25.30, minLongitude: 82.50, maxLongitude: 82.75, pinCodes: ['231001', '231002', '231003', '231004', '231005', '231006', '231007', '231008', '231009', '231010'] },
  { city: 'Deoria', state: 'Uttar Pradesh', district: 'Deoria', minLatitude: 26.40, maxLatitude: 26.65, minLongitude: 83.70, maxLongitude: 83.95, pinCodes: ['274001', '274002', '274003', '274004', '274005', '274006', '274007', '274008', '274009', '274010'] },
  { city: 'Mau', state: 'Uttar Pradesh', district: 'Mau', minLatitude: 25.90, maxLatitude: 26.15, minLongitude: 83.50, maxLongitude: 83.75, pinCodes: ['275101', '275102', '275103', '275104', '275105', '275106', '275107', '275108', '275109', '275110'] },
  { city: 'Ballia', state: 'Uttar Pradesh', district: 'Ballia', minLatitude: 25.70, maxLatitude: 25.95, minLongitude: 84.05, maxLongitude: 84.30, pinCodes: ['277001', '277002', '277003', '277004', '277005', '277006', '277007', '277008', '277009', '277010'] },
  { city: 'Kushinagar', state: 'Uttar Pradesh', district: 'Kushinagar', minLatitude: 26.65, maxLatitude: 26.90, minLongitude: 83.85, maxLongitude: 84.10, pinCodes: ['274403', '274404', '274405', '274406', '274407', '274408', '274409', '274410'] },
  { city: 'Maharajganj', state: 'Uttar Pradesh', district: 'Maharajganj', minLatitude: 27.05, maxLatitude: 27.30, minLongitude: 83.45, maxLongitude: 83.70, pinCodes: ['273303', '273304', '273305', '273306', '273307', '273308', '273309', '273310'] },
  { city: 'Siddharthnagar', state: 'Uttar Pradesh', district: 'Siddharthnagar', minLatitude: 27.10, maxLatitude: 27.40, minLongitude: 83.00, maxLongitude: 83.30, pinCodes: ['272153', '272154', '272155', '272156', '272157', '272158', '272159', '272160'] },
  // Delhi
  { city: 'New Delhi', state: 'Delhi', district: 'New Delhi', minLatitude: 28.40, maxLatitude: 28.90, minLongitude: 76.85, maxLongitude: 77.35, pinCodes: ['110001', '110002', '110003', '110004', '110005', '110006', '110007', '110008', '110009', '110010', '110011', '110012', '110013', '110014', '110015', '110016', '110017', '110018', '110019', '110020', '110021', '110022', '110023', '110024', '110025', '110026', '110027', '110028', '110029', '110030'] },
  // Maharashtra
  { city: 'Mumbai', state: 'Maharashtra', district: 'Mumbai', minLatitude: 18.85, maxLatitude: 19.30, minLongitude: 72.75, maxLongitude: 73.05, pinCodes: ['400001', '400002', '400003', '400004', '400005', '400006', '400007', '400008', '400009', '400010'] },
  { city: 'Pune', state: 'Maharashtra', district: 'Pune', minLatitude: 18.40, maxLatitude: 18.65, minLongitude: 73.70, maxLongitude: 73.95, pinCodes: ['411001', '411002', '411003', '411004', '411005', '411006', '411007', '411008', '411009', '411010'] },
  // Karnataka
  { city: 'Bengaluru', state: 'Karnataka', district: 'Bengaluru Urban', minLatitude: 12.80, maxLatitude: 13.15, minLongitude: 77.45, maxLongitude: 77.80, pinCodes: ['560001', '560002', '560003', '560004', '560005', '560006', '560007', '560008', '560009', '560010'] },
  // Tamil Nadu
  { city: 'Chennai', state: 'Tamil Nadu', district: 'Chennai', minLatitude: 12.90, maxLatitude: 13.25, minLongitude: 80.10, maxLongitude: 80.35, pinCodes: ['600001', '600002', '600003', '600004', '600005', '600006', '600007', '600008', '600009', '600010'] },
  // West Bengal
  { city: 'Kolkata', state: 'West Bengal', district: 'Kolkata', minLatitude: 22.40, maxLatitude: 22.70, minLongitude: 88.20, maxLongitude: 88.50, pinCodes: ['700001', '700002', '700003', '700004', '700005', '700006', '700007', '700008', '700009', '700010'] },
  // Rajasthan
  { city: 'Jaipur', state: 'Rajasthan', district: 'Jaipur', minLatitude: 26.75, maxLatitude: 27.05, minLongitude: 75.65, maxLongitude: 75.95, pinCodes: ['302001', '302002', '302003', '302004', '302005', '302006', '302007', '302008', '302009', '302010'] },
  // Gujarat
  { city: 'Ahmedabad', state: 'Gujarat', district: 'Ahmedabad', minLatitude: 22.90, maxLatitude: 23.20, minLongitude: 72.45, maxLongitude: 72.75, pinCodes: ['380001', '380002', '380003', '380004', '380005', '380006', '380007', '380008', '380009', '380010'] },
  // Madhya Pradesh
  { city: 'Bhopal', state: 'Madhya Pradesh', district: 'Bhopal', minLatitude: 23.10, maxLatitude: 23.35, minLongitude: 77.25, maxLongitude: 77.55, pinCodes: ['462001', '462002', '462003', '462004', '462005', '462006', '462007', '462008', '462009', '462010'] },
  { city: 'Indore', state: 'Madhya Pradesh', district: 'Indore', minLatitude: 22.55, maxLatitude: 22.80, minLongitude: 75.75, maxLongitude: 76.00, pinCodes: ['452001', '452002', '452003', '452004', '452005', '452006', '452007', '452008', '452009', '452010'] },
  // Bihar
  { city: 'Patna', state: 'Bihar', district: 'Patna', minLatitude: 25.45, maxLatitude: 25.75, minLongitude: 85.00, maxLongitude: 85.30, pinCodes: ['800001', '800002', '800003', '800004', '800005', '800006', '800007', '800008', '800009', '800010'] },
  // Haryana
  { city: 'Gurugram', state: 'Haryana', district: 'Gurugram', minLatitude: 28.35, maxLatitude: 28.55, minLongitude: 76.95, maxLongitude: 77.15, pinCodes: ['122001', '122002', '122003', '122004', '122005', '122006', '122007', '122008', '122009', '122010'] },
  { city: 'Faridabad', state: 'Haryana', district: 'Faridabad', minLatitude: 28.30, maxLatitude: 28.50, minLongitude: 77.25, maxLongitude: 77.45, pinCodes: ['121001', '121002', '121003', '121004', '121005', '121006', '121007', '121008', '121009', '121010'] },
];

const seedLocations = async () => {
  try {
    const mongoUri = process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/ngo_management_system';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const existingCount = await LocationMaster.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️ ${existingCount} locations already exist. Skipping seed.`);
      console.log('💡 To re-seed, delete existing locations first.');
      process.exit(0);
    }

    await LocationMaster.insertMany(locations);
    console.log(`✅ Successfully seeded ${locations.length} locations!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding locations:', error.message);
    process.exit(1);
  }
};

seedLocations();
