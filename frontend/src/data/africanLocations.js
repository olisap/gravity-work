/**
 * Comprehensive Pan-African Location Dataset
 * Covers African countries and their respective states, regions, provinces, and counties.
 */
export const AFRICAN_LOCATIONS = [
  {
    country: "Nigeria",
    currency: "₦",
    code: "NG",
    phoneCode: "+234",
    states: [
      "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
      "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Abuja (FCT)", "Gombe", 
      "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
      "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", 
      "Taraba", "Yobe", "Zamfara"
    ]
  },
  {
    country: "Ghana",
    currency: "GH₵",
    code: "GH",
    phoneCode: "+233",
    states: [
      "Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern", "Greater Accra", 
      "North East", "Northern", "Oti", "Savannah", "Upper East", "Upper West", "Volta", 
      "Western", "Western North"
    ]
  },
  {
    country: "Kenya",
    currency: "KSh",
    code: "KE",
    phoneCode: "+254",
    states: [
      "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay",
      "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", 
      "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", 
      "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", 
      "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", 
      "Tharaka-Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"
    ]
  },
  {
    country: "South Africa",
    currency: "R",
    code: "ZA",
    phoneCode: "+27",
    states: [
      "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", 
      "North West", "Northern Cape", "Western Cape"
    ]
  },
  {
    country: "Egypt",
    currency: "E£",
    code: "EG",
    phoneCode: "+20",
    states: [
      "Alexandria", "Aswan", "Asyut", "Beheira", "Beni Suef", "Cairo", "Dakahlia", 
      "Damietta", "Faiyum", "Gharbia", "Giza", "Ismailia", "Kafr El Sheikh", "Luxor", 
      "Matrouh", "Minya", "Monufia", "New Valley", "North Sinai", "Port Said", "Qalyubia", 
      "Qena", "Red Sea", "Sharqia", "Sohag", "South Sinai", "Suez"
    ]
  },
  {
    country: "Rwanda",
    currency: "FRw",
    code: "RW",
    phoneCode: "+250",
    states: ["Kigali", "Eastern Province", "Northern Province", "Southern Province", "Western Province"]
  },
  {
    country: "Uganda",
    currency: "USh",
    code: "UG",
    phoneCode: "+256",
    states: ["Central Region (Kampala)", "Eastern Region", "Northern Region", "Western Region"]
  },
  {
    country: "Tanzania",
    currency: "TSh",
    code: "TZ",
    phoneCode: "+255",
    states: [
      "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma", 
      "Kilimanjaro", "Lindi", "Manyara", "Mara", "Mbeya", "Morogoro", "Mtwara", "Mwanza", 
      "Njombe", "Pemba North", "Pemba South", "Pwani", "Rukwa", "Ruvuma", "Shinyanga", 
      "Simiyu", "Singida", "Songwe", "Tabora", "Tanga", "Zanzibar Central/South", "Zanzibar North", "Zanzibar Urban/West"
    ]
  },
  {
    country: "Ivory Coast (Côte d'Ivoire)",
    currency: "CFA",
    code: "CI",
    phoneCode: "+225",
    states: [
      "Abidjan", "Bas-Sassandra", "Comoé", "Denguélé", "Gôh-Djiboua", "Lacs", "Lagunes", 
      "Montagnes", "Moyen-Cavally", "Sassandra-Marahoué", "Savanes", "Vallee du Bandama", "Zanzan"
    ]
  },
  {
    country: "Senegal",
    currency: "CFA",
    code: "SN",
    phoneCode: "+221",
    states: [
      "Dakar", "Diourbel", "Fatick", "Kaffrine", "Kaolack", "Kédougou", "Kolda", 
      "Louga", "Matam", "Saint-Louis", "Sédhiou", "Tambacounda", "Thiès", "Ziguinchor"
    ]
  },
  {
    country: "Morocco",
    currency: "MAD",
    code: "MA",
    phoneCode: "+212",
    states: [
      "Agadir-Ida Ou Tanane", "Casablanca", "Fès", "Marrakech", "Rabat", "Tanger-Tétouan", "Oujda", "Meknès"
    ]
  },
  {
    country: "Ethiopia",
    currency: "ETB",
    code: "ET",
    phoneCode: "+251",
    states: [
      "Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Dire Dawa", "Gambela", 
      "Harari", "Oromia", "Sidama", "Somali", "South West Ethiopia", "Southern Nations", "Tigray"
    ]
  },
  {
    country: "Cameroon",
    currency: "FCFA",
    code: "CM",
    phoneCode: "+237",
    states: [
      "Adamawa", "Centre (Yaoundé)", "East", "Far North", "Littoral (Douala)", "North", 
      "Northwest", "South", "Southwest", "West"
    ]
  }
];

export function getStatesForCountry(countryName) {
  const found = AFRICAN_LOCATIONS.find(c => c.country.toLowerCase() === (countryName || '').toLowerCase());
  return found ? found.states : (AFRICAN_LOCATIONS[0].states);
}
