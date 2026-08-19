import React, { useState, useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { Search, LogIn, UserPlus, GraduationCap, Users, MapPin, Briefcase, X, ChevronRight, Shield, Mail, Lock, ArrowLeft, UserCircle, Save, Check, Heart, ExternalLink, Linkedin, Instagram, Twitter, HeartHandshake, Link2, Sparkles, SendHorizontal } from "lucide-react";

// ---------- Design tokens ----------
// ---------- Design tokens ----------
// A Hamptons waterfront material palette: sun-bleached linen, deep harbor
// water at dusk, unlacquered brass hardware, sea glass, driftwood, and
// bordeaux. Every name below is used identically everywhere in the app —
// only the values changed, so this one block reskins the whole site.
const INK = "#1E3D4A";        // deep harbor teal-navy, not corporate black-navy
const INK_DEEP = "#132A34";   // harbor water at dusk — still dark enough for light text on top
const PARCHMENT = "#FAF6EE";  // sun-bleached linen, warmer and brighter than old parchment
const PARCHMENT_DEEP = "#EDE3D0"; // soft dune sand for dividers
const BRASS = "#AE8B54";      // unlacquered brass hardware
const BRASS_LIGHT = "#D6B87E"; // brass catching afternoon light
const CRIMSON = "#7A2233";    // deep bordeaux, not terracotta
const ROYAL = "#3E7E82";      // sea glass — the boldest single change from the old corporate blue
const ROYAL_LIGHT = "#6FAAAB"; // sea glass in shallow water
const SLATE = "#7C7266";      // warm driftwood, not cool stone gray
// A soft, warm-toned shadow — natural light through linen, not a cold
// corporate drop-shadow. Used on the major surfaces throughout.
const SOFT_SHADOW = "0 12px 40px rgba(60, 46, 24, 0.10), 0 2px 8px rgba(60, 46, 24, 0.06)";

// ---------- Career taxonomy ----------
// ---------- Supabase backend ----------
// Plain fetch() calls to Supabase's REST (PostgREST) and Auth (GoTrue) APIs
// directly — no @supabase/supabase-js import, since Claude's artifact
// sandbox only allows a fixed set of libraries and that package isn't one
// of them. Functionally identical to using the SDK, just hand-rolled.
const SUPABASE_URL = "https://mmtvxfwpsbpvninkkkcl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_wTmzrVqliL6jcSSCUz6qTA_DSYFd5Ev";

function supabaseHeaders(token) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

async function supabaseSignUp(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || data.error || "Sign up failed.");
  if (!data.access_token) {
    // Shouldn't happen with email confirmation off, but guard anyway.
    throw new Error("Account created, but email confirmation appears to still be required. Check Supabase Authentication settings.");
  }
  return data; // { access_token, user: { id, email, ... } }
}

async function supabaseSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Incorrect email or password.");
  return data; // { access_token, user: { id, email, ... } }
}

// Converts between the app's existing camelCase objects and the
// database's snake_case columns, so the rest of the app's code (which
// already uses firstName, gradYear, helpOffer, etc. everywhere) doesn't
// need to change at all — only these two functions know about the DB shape.
function toDbProfile(p) {
  return {
    first_name: p.firstName || "",
    last_name: p.lastName || "",
    role: p.role || "Alumni",
    grad_year: p.gradYear ? Number(p.gradYear) : null,
    children: p.children || [],
    email: p.email || "",
    phone: p.phone || "",
    city: p.city || "",
    neighborhood: p.neighborhood || "",
    high_school: p.highSchool || "",
    college: p.college || "",
    occupation: p.occupation || "",
    field: p.field || "",
    subfield: p.subfield || "",
    company: p.company || "",
    tier: p.tier || "Friend",
    joined: p.joined || new Date().getFullYear(),
    bio: p.bio || "",
    help_offer: p.helpOffer || "",
    linkedin: p.linkedin || "",
    instagram: p.instagram || "",
    twitter: p.twitter || "",
    other_social_platform: p.otherSocialPlatform || "",
    other_social_handle: p.otherSocialHandle || "",
    visible: p.visible !== false,
    promo_opt_in: !!p.promoOptIn,
  };
}
function fromDbProfile(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    gradYear: row.grad_year,
    children: row.children || [],
    email: row.email,
    phone: row.phone,
    city: row.city,
    neighborhood: row.neighborhood,
    highSchool: row.high_school,
    college: row.college,
    occupation: row.occupation,
    field: row.field,
    subfield: row.subfield,
    company: row.company,
    tier: row.tier,
    joined: row.joined,
    bio: row.bio,
    helpOffer: row.help_offer,
    linkedin: row.linkedin,
    instagram: row.instagram,
    twitter: row.twitter,
    otherSocialPlatform: row.other_social_platform,
    otherSocialHandle: row.other_social_handle,
    visible: row.visible,
    promoOptIn: row.promo_opt_in,
  };
}

async function fetchProfiles(token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, { headers: supabaseHeaders(token) });
  if (!res.ok) throw new Error("Failed to load the directory.");
  const rows = await res.json();
  return rows.map(fromDbProfile);
}
async function insertProfile(token, userId, profile) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...supabaseHeaders(token), Prefer: "return=representation" },
    body: JSON.stringify({ ...toDbProfile(profile), id: userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data && data.message) || "Failed to create your profile.");
  return fromDbProfile(data[0]);
}
async function updateProfileRow(token, id, profile) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(token), Prefer: "return=representation" },
    body: JSON.stringify(toDbProfile(profile)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data && data.message) || "Failed to save your profile.");
  return fromDbProfile(data[0]);
}
async function deleteProfileRow(token, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, { method: "DELETE", headers: supabaseHeaders(token) });
  if (!res.ok) throw new Error("Failed to delete your profile.");
}


const CAREER_FIELDS = {
  "Finance": ["Private Equity", "Investment Banking", "Asset Management", "Wealth Management", "Venture Capital", "Hedge Funds", "Corporate Finance", "Fintech"],
  "Law": ["Corporate Law", "Judiciary", "Litigation", "Intellectual Property", "Tax Law", "Criminal Law"],
  "Medicine": ["Surgery", "Internal Medicine", "Psychiatry", "Pediatrics", "Cardiology", "Oncology", "Dentistry"],
  "Technology": ["Startups", "Product & Design", "Engineering", "Data Science & AI", "Cybersecurity", "Enterprise Software"],
  "Media & Arts": ["Publishing", "Film", "Journalism", "Music", "Museums", "Photography", "Fine Art"],
  "Real Estate": ["Development", "Brokerage", "Property Management", "Real Estate Investment"],
  "Education": ["Academia", "K-12 Education", "Educational Administration", "Ed-Tech"],
  "Government & Nonprofit": ["Foreign Service", "Nonprofit Leadership", "Public Policy", "Philanthropy", "International Development"],
  "Design & Architecture": ["Architecture", "Interior Design", "Landscape Architecture", "Urban Planning"],
  "Hospitality": ["Culinary", "Hotels & Travel", "Event Planning"],
  "Consulting": ["Management Consulting", "Strategy Consulting", "Economic Consulting"],
  "Engineering": ["Civil Engineering", "Mechanical Engineering", "Aerospace", "Environmental Engineering"],
  "Retail & Consumer Goods": ["Fashion & Apparel", "E-Commerce", "Brand Management", "Luxury Goods"],
  "Sports & Entertainment": ["Professional Sports", "Talent Management", "Sports Business", "Broadcasting"],
  "Science & Research": ["Biotech", "Pharmaceuticals", "Academic Research", "Environmental Science"],
  "Energy & Industrials": ["Oil & Gas", "Renewable Energy", "Manufacturing", "Utilities"],
  "Insurance": ["Underwriting", "Actuarial", "Risk Management"],
  "Marketing & Advertising": ["Brand Strategy", "Digital Marketing", "Public Relations", "Creative Direction"],
  "Transportation & Logistics": ["Aviation", "Maritime", "Supply Chain", "Automotive"],
  "Agriculture & Food": ["Farming & Agribusiness", "Food & Beverage", "Winemaking"],
  "Other": ["Other"],
};
const FIELD_NAMES = Object.keys(CAREER_FIELDS);

// occupation -> [field, subfield]
const OCC_TO_FIELD = {
  "Principal, Private Equity": ["Finance", "Private Equity"],
  "Managing Director, Investment Banking": ["Finance", "Investment Banking"],
  "Portfolio Manager, Asset Management": ["Finance", "Asset Management"],
  "Private Wealth Advisor": ["Finance", "Wealth Management"],
  "Partner, Venture Capital": ["Finance", "Venture Capital"],
  "Analyst, Hedge Fund": ["Finance", "Hedge Funds"],
  "Managing Partner, Venture Capital": ["Finance", "Venture Capital"],
  "Portfolio Manager, Hedge Fund": ["Finance", "Hedge Funds"],
  "Investment Banker": ["Finance", "Investment Banking"],
  "Founder & CEO, Tech Startup": ["Technology", "Startups"],
  "Product Designer": ["Technology", "Product & Design"],
  "Cardiothoracic Surgeon": ["Medicine", "Surgery"],
  "Orthopedic Surgeon": ["Medicine", "Surgery"],
  "Editor, Publishing House": ["Media & Arts", "Publishing"],
  "Architect": ["Design & Architecture", "Architecture"],
  "Federal Judge": ["Law", "Judiciary"],
  "Corporate Attorney": ["Law", "Corporate Law"],
  "Documentary Filmmaker": ["Media & Arts", "Film"],
  "Professor of Economics": ["Education", "Academia"],
  "Chef & Restaurateur": ["Hospitality", "Culinary"],
  "Museum Curator": ["Media & Arts", "Museums"],
  "Nonprofit Executive Director": ["Government & Nonprofit", "Nonprofit Leadership"],
  "Real Estate Developer": ["Real Estate", "Development"],
  "Journalist": ["Media & Arts", "Journalism"],
  "Composer": ["Media & Arts", "Music"],
  "Diplomat": ["Government & Nonprofit", "Foreign Service"],
};
const OCCUPATIONS = Object.keys(OCC_TO_FIELD);
// Real, well-known employers appropriate to each occupation — so a
// Private Equity principal is shown working at an actual PE firm, a
// surgeon at an actual hospital, and so on, rather than a random
// unrelated company picked independent of their field. One exception by
// design: startup founders get invented company names, since a real
// founder's company is inherently their own, not an existing famous one.
const OCC_TO_COMPANIES = {
  "Principal, Private Equity": ["Blackstone", "KKR", "Apollo Global Management", "The Carlyle Group", "TPG Inc.", "Warburg Pincus", "Bain Capital", "Vista Equity Partners"],
  "Managing Director, Investment Banking": ["Goldman Sachs", "Morgan Stanley", "J.P. Morgan", "Lazard", "Evercore", "Bank of America", "Citigroup"],
  "Portfolio Manager, Asset Management": ["BlackRock", "Vanguard", "Fidelity Investments", "T. Rowe Price", "PIMCO", "State Street Global Advisors"],
  "Private Wealth Advisor": ["Merrill Private Wealth Management", "Morgan Stanley Wealth Management", "UBS Private Wealth Management", "Goldman Sachs Private Wealth Management", "Northern Trust"],
  "Partner, Venture Capital": ["Sequoia Capital", "Andreessen Horowitz", "Kleiner Perkins", "Benchmark", "Accel", "General Catalyst"],
  "Analyst, Hedge Fund": ["Bridgewater Associates", "Citadel", "Millennium Management", "Point72 Asset Management", "Two Sigma", "D.E. Shaw"],
  "Managing Partner, Venture Capital": ["Sequoia Capital", "Andreessen Horowitz", "Kleiner Perkins", "Benchmark", "Accel", "General Catalyst"],
  "Portfolio Manager, Hedge Fund": ["Bridgewater Associates", "Citadel", "Millennium Management", "Point72 Asset Management", "Two Sigma", "D.E. Shaw"],
  "Investment Banker": ["Goldman Sachs", "Morgan Stanley", "J.P. Morgan", "Lazard", "Evercore", "Bank of America", "Citigroup"],
  "Founder & CEO, Tech Startup": ["Nimbus Health", "Fintary", "Cascade Robotics", "Lattice Analytics", "Verdant Labs"],
  "Product Designer": ["Apple", "Google", "Meta", "Airbnb", "Figma"],
  "Cardiothoracic Surgeon": ["NewYork-Presbyterian", "Mount Sinai Hospital", "NYU Langone Health", "Memorial Sloan Kettering Cancer Center"],
  "Orthopedic Surgeon": ["Hospital for Special Surgery", "NewYork-Presbyterian", "NYU Langone Health", "Mount Sinai Hospital"],
  "Editor, Publishing House": ["Penguin Random House", "HarperCollins", "Simon & Schuster", "Condé Nast"],
  "Architect": ["Skidmore, Owings & Merrill", "Gensler", "Kohn Pedersen Fox", "Rockwell Group"],
  "Federal Judge": ["U.S. District Court, Southern District of New York", "U.S. Court of Appeals for the Second Circuit"],
  "Corporate Attorney": ["Sullivan & Cromwell", "Skadden, Arps, Slate, Meagher & Flom", "Cravath, Swaine & Moore", "Davis Polk & Wardwell", "Wachtell, Lipton, Rosen & Katz"],
  "Documentary Filmmaker": ["A24", "Participant Media", "Netflix", "HBO Documentary Films"],
  "Professor of Economics": ["Columbia University", "New York University", "Harvard University", "Yale University"],
  "Chef & Restaurateur": ["Union Square Hospitality Group", "Momofuku", "Independent"],
  "Museum Curator": ["The Metropolitan Museum of Art", "Museum of Modern Art (MoMA)", "Whitney Museum of American Art", "Solomon R. Guggenheim Museum"],
  "Nonprofit Executive Director": ["American Red Cross", "Robin Hood Foundation", "United Way", "Teach For America"],
  "Real Estate Developer": ["Related Companies", "Tishman Speyer", "Vornado Realty Trust", "SL Green Realty", "Extell Development"],
  "Journalist": ["The New York Times", "The Wall Street Journal", "The Atlantic", "CNN"],
  "Composer": ["New York Philharmonic", "Sony Classical", "Independent"],
  "Diplomat": ["U.S. Department of State"],
};

// ---------- Seeded data generation ----------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const FIRST_NAMES = ["Amelia","Theodore","Josephine","Julian","Cordelia","Nathaniel","Genevieve","August","Beatrice","Sebastian","Charlotte","Emerson","Eleanor","Frederick","Vivienne","Alexander","Marguerite","Weston","Isabelle","Rutherford","Clara","Montgomery","Adelaide","Prescott","Rosalind","Winslow","Lucia","Barnaby","Vera","Ellison","Margot","Desmond","Aurelia","Lachlan","Sylvie","Everett","Odette","Sterling","Wren","Atticus","Imogen","Reginald","Della","Percival","Marisol","Thaddeus","Simone","Cassius","Iris","Anders"];
const LAST_NAMES = ["Whitfield","Ashworth","Delacroix","Prescott","Sinclair","Harrington","Beaumont","Kensington","Radcliffe","Winthrop","Fairweather","Blackwood","Sterling","Ellsworth","Carrington","Marchetti","Vance","Holloway","Pemberton","Castellano","Abernathy","Wexford","Lindqvist","Osei","Nakamura","Feldman","Rothstein","Devereaux","Okafor","Chandrasekaran","Bellweather","Montague","Fitzgerald","Larkspur","Norwood","Halloran","Vasquez","Thackeray","Sørensen","Kim"];
// Major U.S. cities, alphabetized, offered as autocomplete suggestions in the
// City field — useful groundwork for a future map of where alumni live.
const CITIES = ["Atlanta","Austin","Boston","Charlotte","Chicago","Columbus","Dallas","Denver","Detroit","Dubai","El Paso","Fort Worth","Hong Kong","Houston","Indianapolis","Jacksonville","Las Vegas","London","Los Angeles","Louisville","Memphis","Miami","Nashville","New York","Oklahoma City","Paris","Philadelphia","Phoenix","Portland","San Antonio","San Diego","San Francisco","San Jose","Seattle","Singapore","Tokyo","Toronto","Washington, D.C."];

// Real, well-known neighborhoods per city, keyed exactly to the CITIES list
// above, so the Neighborhood suggestions always match the selected City.
const NEIGHBORHOODS_BY_CITY = {
  "Atlanta": ["Ansley Park","Buckhead","Druid Hills","Inman Park","Midtown","Virginia-Highland"],
  "Austin": ["Clarksville","Hyde Park","Tarrytown","Travis Heights","Zilker"],
  "Boston": ["Back Bay","Beacon Hill","Brookline","Charlestown","Dorchester","Fenway","Jamaica Plain","North End","South Boston","South End"],
  "Charlotte": ["Dilworth","Elizabeth","Myers Park","NoDa","SouthPark"],
  "Chicago": ["Bucktown","Gold Coast","Hyde Park","Lakeview","Lincoln Park","Logan Square","Pilsen","River North","West Loop","Wicker Park"],
  "Columbus": ["Clintonville","German Village","Grandview Heights","Short North","Victorian Village"],
  "Dallas": ["Bishop Arts District","Highland Park","Lakewood","Preston Hollow","Uptown"],
  "Denver": ["Capitol Hill","Cherry Creek","Congress Park","Highlands","Wash Park"],
  "Detroit": ["Corktown","Grosse Pointe","Indian Village","Midtown","Palmer Woods"],
  "El Paso": ["Coronado","Kern Place","Mission Hills","Sunset Heights","Upper Valley"],
  "Fort Worth": ["Berkeley","Fairmount","Sundance Square","TCU Area","Westover Hills"],
  "Houston": ["Memorial","Montrose","River Oaks","The Heights","West University"],
  "Indianapolis": ["Broad Ripple","Fountain Square","Herron-Morton","Irvington","Meridian-Kessler"],
  "Jacksonville": ["Avondale","Neptune Beach","Ortega","Riverside","San Marco"],
  "Las Vegas": ["Green Valley","Henderson","Spring Valley","Summerlin","The Lakes"],
  "Los Angeles": ["Bel Air","Beverly Hills","Brentwood","Echo Park","Hollywood Hills","Los Feliz","Pacific Palisades","Santa Monica","Silver Lake","Venice"],
  "Louisville": ["Clifton","Crescent Hill","Highlands","Old Louisville","St. Matthews"],
  "Memphis": ["Cooper-Young","East Memphis","Germantown","Harbor Town","Midtown"],
  "Miami": ["Aventura","Brickell","Coconut Grove","Coral Gables","Key Biscayne","Pinecrest","South Beach","Wynwood"],
  "Nashville": ["12 South","Belle Meade","East Nashville","Germantown","Green Hills"],
  "New York": ["Brooklyn Heights","Carnegie Hill","Chelsea","Cobble Hill","Fort Greene","Gramercy","Greenwich Village","Murray Hill","Park Slope","Riverdale","SoHo","Tribeca","Upper East Side","West Village"],
  "Oklahoma City": ["Edgemere Park","Heritage Hills","Midtown","Nichols Hills","Paseo Arts District"],
  "Philadelphia": ["Chestnut Hill","Fairmount","Fishtown","Manayunk","Old City","Rittenhouse Square","Society Hill"],
  "Phoenix": ["Arcadia","Biltmore","Camelback","Paradise Valley","Scottsdale"],
  "Portland": ["Alberta Arts District","Hawthorne","Nob Hill","Pearl District","Sellwood"],
  "San Antonio": ["Alamo Heights","King William","Monte Vista","Southtown","Terrell Hills"],
  "San Diego": ["Coronado","Hillcrest","La Jolla","North Park","Pacific Beach"],
  "San Francisco": ["Cole Valley","Hayes Valley","Marina District","Mission District","Nob Hill","Noe Valley","Pacific Heights","Presidio Heights","Russian Hill","SoMa"],
  "San Jose": ["Almaden Valley","Japantown","Naglee Park","Rose Garden","Willow Glen"],
  "Seattle": ["Ballard","Capitol Hill","Fremont","Madison Park","Queen Anne","Wallingford"],
  "Washington, D.C.": ["Adams Morgan","Capitol Hill","Chevy Chase","Cleveland Park","Dupont Circle","Foggy Bottom","Georgetown","Kalorama","Logan Circle"],
  "Dubai": ["Downtown Dubai","Dubai Marina","Emirates Hills","Jumeirah","Palm Jumeirah"],
  "Hong Kong": ["Central","Discovery Bay","Mid-Levels","Repulse Bay","The Peak"],
  "London": ["Chelsea","Hampstead","Kensington","Mayfair","Notting Hill"],
  "Paris": ["Auteuil","Le Marais","Montmartre","Passy","Saint-Germain"],
  "Singapore": ["Bukit Timah","Marina Bay","Orchard","Sentosa","Tanglin"],
  "Tokyo": ["Azabu","Meguro","Minato","Roppongi","Shibuya"],
  "Toronto": ["Forest Hill","King West","Rosedale","The Annex","Yorkville"],
};
// Kept as the default/seed-data list — New York, since that's every seeded
// record's city — and as a fallback for any city not in the map above.
const NEIGHBORHOODS = NEIGHBORHOODS_BY_CITY["New York"];
// Looks up neighborhoods for a given city name, case-insensitively, falling
// back to an empty list (no suggestions) if the city isn't recognized yet.
function neighborhoodsForCity(cityValue) {
  const key = Object.keys(NEIGHBORHOODS_BY_CITY).find(
    (c) => c.toLowerCase() === (cityValue || "").trim().toLowerCase()
  );
  return key ? NEIGHBORHOODS_BY_CITY[key] : [];
}
// Coordinates for the Community Map. Keyed exactly to CITIES above.
const CITY_COORDS = {
  "Atlanta": [33.749, -84.388],
  "Austin": [30.2672, -97.7431],
  "Boston": [42.3601, -71.0589],
  "Charlotte": [35.2271, -80.8431],
  "Chicago": [41.8781, -87.6298],
  "Columbus": [39.9612, -82.9988],
  "Dallas": [32.7767, -96.797],
  "Denver": [39.7392, -104.9903],
  "Detroit": [42.3314, -83.0458],
  "Dubai": [25.2048, 55.2708],
  "El Paso": [31.7619, -106.485],
  "Fort Worth": [32.7555, -97.3308],
  "Hong Kong": [22.3193, 114.1694],
  "Houston": [29.7604, -95.3698],
  "Indianapolis": [39.7684, -86.1581],
  "Jacksonville": [30.3322, -81.6557],
  "Las Vegas": [36.1699, -115.1398],
  "London": [51.5072, -0.1276],
  "Los Angeles": [34.0522, -118.2437],
  "Louisville": [38.2527, -85.7585],
  "Memphis": [35.1495, -90.049],
  "Miami": [25.7617, -80.1918],
  "Nashville": [36.1627, -86.7816],
  "New York": [40.7128, -74.006],
  "Oklahoma City": [35.4676, -97.5164],
  "Paris": [48.8566, 2.3522],
  "Philadelphia": [39.9526, -75.1652],
  "Phoenix": [33.4484, -112.074],
  "Portland": [45.5152, -122.6784],
  "San Antonio": [29.4241, -98.4936],
  "San Diego": [32.7157, -117.1611],
  "San Francisco": [37.7749, -122.4194],
  "San Jose": [37.3382, -121.8863],
  "Seattle": [47.6062, -122.3321],
  "Singapore": [1.3521, 103.8198],
  "Tokyo": [35.6762, 139.6503],
  "Toronto": [43.6532, -79.3832],
  "Washington, D.C.": [38.9072, -77.0369],
};
// Common country abbreviation per city, keyed exactly to CITIES/CITY_COORDS.
// Uses whichever short form is most commonly recognized (USA, UK, UAE), not
// strictly ISO alpha-2/alpha-3 throughout.
const COUNTRY_ABBR_BY_CITY = {
  "Dubai": "UAE",
  "Hong Kong": "HK",
  "London": "UK",
  "Paris": "FR",
  "Singapore": "SG",
  "Tokyo": "JP",
  "Toronto": "CA",
};
function countryAbbrForCity(cityValue) {
  const key = Object.keys(COUNTRY_ABBR_BY_CITY).find(
    (c) => c.toLowerCase() === (cityValue || "").trim().toLowerCase()
  );
  if (key) return COUNTRY_ABBR_BY_CITY[key];
  const isKnownUSCity = Object.keys(CITY_COORDS).some(
    (c) => c.toLowerCase() === (cityValue || "").trim().toLowerCase() && !COUNTRY_ABBR_BY_CITY[c]
  );
  return isKnownUSCity ? "USA" : null;
}
// Formats the Directory's Location cell: "City, Country Abbreviation".
function formatLocation(p) {
  if (!p || !p.city) return null;
  const abbr = countryAbbrForCity(p.city);
  return abbr ? `${p.city}, ${abbr}` : p.city;
}

// Builds a real, clickable profile URL from whatever someone typed into a
// social field — they might have pasted a full profile URL (with or
// without "https://"), or just their handle/username. Either way this
// resolves to something clickable, and never double-wraps a URL that
// already contains the platform's domain.
function cleanHandle(v) {
  return (v || "").trim().replace(/^@/, "");
}
function looksLikeUrlFor(v, domains) {
  const lower = v.toLowerCase();
  return domains.some((d) => lower.includes(d));
}
function socialProfileUrl(kind, value) {
  if (!value) return null;
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v; // already has a protocol — use as-is
  const domains = kind === "linkedin" ? ["linkedin.com"] : kind === "instagram" ? ["instagram.com"] : kind === "twitter" ? ["x.com", "twitter.com"] : [];
  if (looksLikeUrlFor(v, domains)) return `https://${v.replace(/^\/+/, "")}`; // has the domain but no protocol
  const handle = cleanHandle(v);
  if (!handle) return null;
  if (kind === "linkedin") return `https://www.linkedin.com/in/${handle}`;
  if (kind === "instagram") return `https://instagram.com/${handle}`;
  if (kind === "twitter") return `https://x.com/${handle}`;
  return null;
}
// Same idea, for the "Other" platform dropdown — best-effort URL templates
// for each of the five options offered there.
function otherSocialUrl(platform, value) {
  if (!value) return null;
  const v = value.trim();
  const p = (platform || "").toLowerCase();
  if (/^https?:\/\//i.test(v)) return v;
  const domains = p === "facebook" ? ["facebook.com"] : p === "tiktok" ? ["tiktok.com"] : p === "youtube" ? ["youtube.com", "youtu.be"] : p === "snapchat" ? ["snapchat.com"] : p === "whatsapp" ? ["wa.me", "whatsapp.com"] : [];
  if (looksLikeUrlFor(v, domains)) return `https://${v.replace(/^\/+/, "")}`;
  const handle = cleanHandle(v);
  if (!handle) return null;
  if (p === "facebook") return `https://facebook.com/${handle}`;
  if (p === "tiktok") return `https://tiktok.com/@${handle}`;
  if (p === "youtube") return `https://youtube.com/@${handle}`;
  if (p === "snapchat") return `https://snapchat.com/add/${handle}`;
  if (p === "whatsapp") return `https://wa.me/${handle.replace(/\D/g, "")}`;
  return null;
}

// ---------- Optimus.AI matching engine ----------
// Entirely client-side keyword matching — no calls to any AI API. That's a
// deliberate choice: a live AI-powered search would require every viewer to
// be signed into Claude (breaking the no-login demo link) and would send
// real member data to an external call on every search. This scores members
// against a query locally, in the browser, using their "how I can help"
// text plus career/location/education fields — genuinely useful matching,
// just pattern-based rather than a live model reasoning about it.
const SEARCH_STOPWORDS = new Set(["the","a","an","i","im","and","or","for","to","with","in","on","at","of","is","are","need","want","looking","help","someone","who","that","can","could","would","like","about","into","from"]);
function tokenize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !SEARCH_STOPWORDS.has(w));
}
// Edit distance between two words, counting an adjacent-letter swap (the
// single most common typo — "Grotno" for "Groton") as one edit rather than
// two, the way plain Levenshtein distance would.
function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[m][n];
}
// True if two words are the same, one contains the other, or they're close
// enough to plausibly be a typo of each other. Short words (3 letters)
// require an exact/substring match — fuzzy-matching very short words
// produces too many false positives ("law" vs "raw") to be worth it.
function wordsMatch(a, b) {
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const minLen = Math.min(a.length, b.length);
  const allowedTypos = minLen <= 3 ? 0 : minLen <= 6 ? 1 : 2;
  return allowedTypos > 0 && editDistance(a, b) <= allowedTypos;
}
function searchMembers(query, people, excludeId) {
  const queryTokens = [...new Set(tokenize(query))];
  if (queryTokens.length === 0) return [];
  const results = [];
  people.forEach((p) => {
    if (p.visible === false) return;
    if (excludeId && p.id === excludeId) return;
    const fields = [
      { text: p.helpOffer, label: "how they can help", weight: 4 },
      { text: p.occupation, label: "occupation", weight: 2 },
      { text: p.field, label: "career field", weight: 2 },
      { text: p.subfield, label: "specialty", weight: 2 },
      { text: p.company, label: "affiliation", weight: 1 },
      { text: p.city, label: "location", weight: 1 },
      { text: p.neighborhood, label: "location", weight: 1 },
      { text: p.highSchool, label: "high school", weight: 1 },
      { text: p.college, label: "college", weight: 1 },
    ];
    let score = 0;
    const matchedLabels = new Set();
    const matchedWords = new Set();
    queryTokens.forEach((qt) => {
      fields.forEach((f) => {
        const fieldTokens = tokenize(f.text);
        const hit = fieldTokens.some((ft) => wordsMatch(ft, qt));
        if (hit) {
          score += f.weight;
          matchedLabels.add(f.label);
          matchedWords.add(qt);
        }
      });
    });
    if (score > 0) results.push({ person: p, score, matchedLabels: [...matchedLabels], matchedWords: [...matchedWords] });
  });
  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}

// A handful of other popular platforms, offered via a dropdown so the
// social section doesn't need a dedicated icon row for every possible site.
const OTHER_SOCIAL_PLATFORMS = ["Facebook", "TikTok", "YouTube", "Snapchat", "WhatsApp"];
// Well-known independent/boarding secondary schools — offered as autocomplete
// suggestions for the High School field, since Buckley (K-9) alumni move on
// to a separate high school.
const HIGH_SCHOOLS = ["Andover (Phillips Academy)","Browning School","Choate Rosemary Hall","Collegiate School","Deerfield Academy","Groton School","Horace Mann School","Hotchkiss School","Loomis Chaffee","Lawrenceville School","Milton Academy","Riverdale Country School","St. Bernard's School","St. Paul's School","Taft School","Trinity School","The Dalton School","The Hill School","The Hotchkiss School","Trinity-Pawling School"];
// Top ~200 globally recognized universities, offered as autocomplete
// suggestions for the College field — sorted alphabetically.
const UNIVERSITIES = [
  "American University","American University of Beirut","Amherst College","Arizona State University","Auburn University","Australian National University",
  "Babson College","Barnard College","Bates College","Baylor University","Bocconi University","Boston College","Boston University","Bowdoin College",
  "Brandeis University","Brigham Young University","Brown University","Bucknell University",
  "California Institute of Technology","Carleton College","Carnegie Mellon University","Case Western Reserve University","Charles University Prague","Chinese University of Hong Kong",
  "City University of Hong Kong","Claremont McKenna College","Clemson University","Colby College","Colgate University","College of William & Mary","Colorado College","Columbia University",
  "Connecticut College","Cornell University",
  "Dartmouth College","Davidson College","Delft University of Technology","Denison University","DePauw University","Drexel University","Duke University","Durham University",
  "Emory University","ETH Zurich","École Polytechnique","École Polytechnique Fédérale de Lausanne (EPFL)",
  "Fordham University","Fudan University",
  "George Washington University","Georgetown University","Georgia Institute of Technology","Grinnell College",
  "Hamilton College","Harvard University","Harvey Mudd College","Haverford College","Hebrew University of Jerusalem","Heidelberg University","Hong Kong University of Science and Technology","Howard University",
  "IE University","Imperial College London","Indian Institute of Technology Bombay","Indian Institute of Technology Delhi","Indiana University Bloomington",
  "Johns Hopkins University",
  "KAIST","Karolinska Institute","Kenyon College","King's College London","KU Leuven","Kyoto University",
  "Lafayette College","Lehigh University","London School of Economics","Loyola Marymount University",
  "Macalester College","Massachusetts Institute of Technology (MIT)","McGill University","McMaster University","Michigan State University","Middlebury College","Monash University","Morehouse College","Mount Holyoke College",
  "Nanyang Technological University","National University of Singapore","New York University (NYU)","North Carolina State University","Northwestern University","Notre Dame (University of Notre Dame)",
  "Oberlin College","Occidental College","Ohio State University","Oxford (University of Oxford)",
  "Peking University","Pennsylvania State University","Pepperdine University","Pomona College","Pontificia Universidad Católica de Chile","Princeton University","Purdue University",
  "Queen's University",
  "Reed College","Rice University","Rutgers University",
  "Santa Clara University","Sapienza University of Rome","School of the Art Institute of Chicago","Sciences Po","Seoul National University","Shanghai Jiao Tong University","Skidmore College","Smith College","Southern Methodist University (SMU)","Spelman College","Stanford University","Stevens Institute of Technology","Swarthmore College","Syracuse University",
  "Technical University of Munich","Technion – Israel Institute of Technology","Tel Aviv University","Temple University","Texas A&M University","Texas Christian University (TCU)","The Chinese University of Hong Kong","The University of Hong Kong","Trinity College","Trinity College Dublin","Tsinghua University","Tufts University","Tulane University",
  "Union College","University College Dublin","University College London (UCL)","University of Alabama","University of Alberta","University of Amsterdam","University of Arizona","University of Bristol","University of British Columbia",
  "University of Cambridge","University of Cape Town","University of Chicago","University of Colorado Boulder","University of Connecticut","University of Copenhagen","University of Denver","University of Edinburgh",
  "University of Florida","University of Geneva","University of Georgia","University of Glasgow","University of Illinois Urbana-Champaign","University of Iowa","University of Leeds","University of Manchester",
  "University of Maryland","University of Melbourne","University of Miami","University of Michigan","University of Minnesota","University of Montreal","University of Nottingham","University of Oregon",
  "University of Pennsylvania (UPenn)","University of Pittsburgh","University of Queensland","University of Rochester","University of São Paulo","University of Sheffield","University of Southern California (USC)",
  "University of St Andrews","University of Sydney","University of Texas at Austin","University of Tokyo","University of Toronto","University of Utah","University of Virginia","University of Warwick",
  "University of Washington","University of Waterloo","University of Wisconsin-Madison","University of Zurich","Universidad Nacional Autónoma de México (UNAM)","Uppsala University",
  "Vanderbilt University","Vassar College","Villanova University","Virginia Tech","Wake Forest University","Washington and Lee University","Washington University in St. Louis","Wellesley College",
  "Wesleyan University","West Point (United States Military Academy)","Western University","Wheaton College","Williams College","Yale University","Yonsei University",
].sort();
const COMPANIES = ["Ashworth Capital","Meridian Partners","NewYork-Presbyterian","Halcyon Books","Kensington & Vance LLP","Blackwood Ventures","Lindqvist Studio","Columbia University","Fairweather Films","Radcliffe Group","Independent","Sterling & Holloway","City Health System","The Marchetti Foundation"];
const TIERS = ["Friend","Sustainer","Patron","Benefactor","Cornerstone Circle"];
// Formats one child's graduation year for display — always just a year,
// whether it's already happened or is still expected.
function formatChild(child) {
  if (!child || !child.gradYear) return null;
  return String(child.gradYear);
}
// Comma-separated summary of every child's graduation year — e.g. "2020, 2022".
function formatChildrenSummary(p) {
  const kids = (p && p.children) || [];
  const parts = kids.map((c) => formatChild(c)).filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}
function makeChild(lastName) {
  // A graduation year, actual (past) or expected (future) — a K-9 school's
  // current students graduate anywhere from this year out to about 9 years
  // from now, while older siblings may have already graduated years back.
  return {
    name: `${pick(FIRST_NAMES)} ${lastName}`,
    gradYear: 2015 + Math.floor(rand() * 20),
  };
}

function makePerson(i) {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const isAlumni = rand() > 0.35;
  const isParent = !isAlumni ? true : rand() > 0.6;
  let role = isAlumni && isParent ? "Alumni & Parent" : isAlumni ? "Alumni" : "Parent";
  const gradYear = isAlumni ? 1985 + Math.floor(rand() * 39) : null;
  // Most parents have one child at/through Buckley; a meaningful minority
  // have two (e.g. one graduated, one currently enrolled, or both/either).
  const childCount = isParent ? (rand() > 0.82 ? 2 : 1) : 0;
  const children = Array.from({ length: childCount }, () => makeChild(last));
  const occupation = pick(OCCUPATIONS);
  const [field, subfield] = OCC_TO_FIELD[occupation];
  // Weighted city spread: most families stay in New York (it's a NYC day
  // school), but a meaningful share land elsewhere — domestically and
  // abroad — which is exactly what the Community Map is meant to show.
  const city = rand() < 0.45 ? "New York" : pick(CITIES.filter((c) => c !== "New York"));
  const neighborhood = pick(NEIGHBORHOODS_BY_CITY[city] || NEIGHBORHOODS_BY_CITY["New York"]);
  // High school / college: Buckley is K-9, so alumni move on to a separate
  // high school afterward. A recent Buckley graduate (within the last ~4
  // years) is likely still IN high school, so they shouldn't have a college
  // listed yet — parents (non-alumni) aren't tied to Buckley's timeline, so
  // their own education is generated independently.
  const currentYear = new Date().getFullYear();
  const finishedHighSchool = isAlumni ? currentYear - gradYear >= 4 : true;
  const highSchool = (isAlumni || isParent) && rand() > 0.1 ? pick(HIGH_SCHOOLS) : null;
  const college = highSchool && finishedHighSchool && rand() > 0.2 ? pick(UNIVERSITIES) : null;
  return {
    id: i + 1,
    firstName: first,
    lastName: last,
    role,
    gradYear,
    children,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${pick(["gmail.com","protonmail.com","icloud.com","aol.com"])}`,
    phone: `(${212 + Math.floor(rand()*90)}) 555-${1000 + Math.floor(rand()*8999)}`,
    city,
    neighborhood,
    highSchool,
    college,
    occupation,
    field,
    subfield,
    company: pick(OCC_TO_COMPANIES[occupation] || COMPANIES),
    tier: pick(TIERS),
    joined: 2019 + Math.floor(rand() * 7),
    bio: "",
    visible: true,
  };
}

// ---------- Small components ----------
function Crest({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M32 4 L58 14 V30 C58 46 47 57 32 60 C17 57 6 46 6 30 V14 Z" stroke={BRASS_LIGHT} strokeWidth="1.5" fill={INK_DEEP} />
      <path d="M32 4 L58 14 V30 C58 46 47 57 32 60" stroke={BRASS_LIGHT} strokeWidth="1.5" fill="none" opacity="0.5" />
      <text x="32" y="38" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="24" fill={BRASS_LIGHT}>B</text>
      <circle cx="32" cy="32" r="26" stroke={BRASS_LIGHT} strokeWidth="0.5" fill="none" opacity="0.4" />
      <circle cx="32" cy="32" r="21" stroke={ROYAL_LIGHT} strokeWidth="0.75" fill="none" opacity="0.55" />
    </svg>
  );
}

function Initials({ first, last }) {
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: 38, height: 38, background: INK, border: `1px solid ${BRASS}`, color: BRASS_LIGHT, fontFamily: "Cormorant Garamond, serif", fontSize: 14, letterSpacing: "0.05em" }}
    >
      {first[0]}{last[0]}
    </div>
  );
}

function TierTag({ tier }) {
  const colors = {
    "Friend": { bg: "#EFE9DA", fg: SLATE },
    "Sustainer": { bg: "#E4D9BE", fg: "#7A5F2E" },
    "Patron": { bg: "#DCC48F", fg: "#5C4318" },
    "Benefactor": { bg: CRIMSON, fg: "#F3EEE2" },
    "Cornerstone Circle": { bg: ROYAL, fg: "#F3EEE2" },
  };
  const c = colors[tier] || colors.Friend;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-sm uppercase tracking-wide"
      style={{ background: c.bg, color: c.fg, fontSize: 10, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.08em" }}
    >
      {tier}
    </span>
  );
}

const fldStyle = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 2,
  border: `1px solid ${PARCHMENT_DEEP}`,
  fontFamily: "Source Serif 4, serif",
  fontSize: 14,
  color: INK,
  background: "#fff",
  outline: "none",
};

function Field({ label, children }) {
  return (
    <div>
      <label className="block mb-1.5" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.1em", color: SLATE }}>{label}</label>
      {children}
    </div>
  );
}

// Typeahead input: shows matching suggestions from a fixed list as the person
// types, so entries stay consistent (e.g. real city/neighborhood names) —
// also lays the groundwork for a future map view keyed off these values.
function AutocompleteInput({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const q = (value || "").trim().toLowerCase();
  const filtered = (q ? options.filter((o) => o.toLowerCase().includes(q)) : options).slice(0, 6);
  return (
    <div style={{ position: "relative" }}>
      <input
        value={value || ""}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        style={{ ...fldStyle, paddingRight: value ? 30 : 11 }}
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onChange(""); }}
          title="Clear"
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            color: SLATE,
            lineHeight: 1,
            fontSize: 16,
          }}
        >
          ×
        </button>
      )}
      {open && filtered.length > 0 && (
        <div
          className="absolute left-0 right-0"
          style={{
            top: "calc(100% + 4px)",
            background: "#fff",
            border: `1px solid ${PARCHMENT_DEEP}`,
            borderRadius: 2,
            maxHeight: 190,
            overflowY: "auto",
            zIndex: 30,
            boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
          }}
        >
          {filtered.map((opt, idx) => (
            <div
              key={opt}
              onMouseDown={() => { onChange(opt); setOpen(false); }}
              className="hover:opacity-90"
              style={{
                padding: "8px 12px",
                fontFamily: "Source Serif 4, serif",
                fontSize: 13,
                color: INK,
                cursor: "pointer",
                borderTop: idx === 0 ? "none" : `1px solid ${PARCHMENT_DEEP}`,
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// A year dropdown with a "type my own / reset" escape hatch, matching the
// Career Field pattern — covers the realistic range for a Buckley-linked
// graduation year (own or a son's, past or expected future) without forcing
// someone into a fixed list if their actual year falls outside it.
function YearSelect({ value, onChange, isCustom, onToggleCustom, placeholder }) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear + 15; y >= 1950; y--) years.push(y);
  if (isCustom) {
    return (
      <div className="flex items-center gap-2">
        <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={fldStyle} autoFocus />
        <button type="button" onClick={() => onToggleCustom(false)} style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: ROYAL, whiteSpace: "nowrap" }}>
          LIST
        </button>
      </div>
    );
  }
  return (
    <select
      value={years.includes(Number(value)) ? Number(value) : ""}
      onChange={(e) => {
        if (e.target.value === "") { onToggleCustom(true); onChange(""); }
        else onChange(e.target.value);
      }}
      style={fldStyle}
    >
      <option value="">— Type my own / reset —</option>
      {years.map((y) => <option key={y} value={y}>{y}</option>)}
    </select>
  );
}

const REAL_COUNTRY_RINGS = [[[178.12,-17.51],[178.37,-17.34],[178.72,-17.63],[178.55,-18.15],[177.93,-18.29],[177.38,-18.16],[177.29,-17.72],[177.67,-17.38],[178.12,-17.51]],[[-180,-16.07],[-179.79,-16.02],[-179.92,-16.5],[-180,-16.56],[179.36,-16.8],[178.73,-17.01],[178.6,-16.64],[179.1,-16.43],[179.41,-16.38],[180,-16.07],[-180,-16.07]],[[33.9,-0.95],[34.07,-1.06],[37.7,-3.1],[37.77,-3.68],[39.2,-4.68],[38.74,-5.91],[38.8,-6.48],[39.44,-6.84],[39.47,-7.1],[39.2,-7.7],[39.25,-8.01],[39.19,-8.49],[39.54,-9.11],[39.95,-10.1],[40.32,-10.32],[39.52,-10.9],[38.43,-11.29],[37.83,-11.27],[37.47,-11.57],[36.78,-11.6],[36.51,-11.72],[35.31,-11.44],[34.56,-11.52],[34.28,-10.16],[33.94,-9.69],[33.74,-9.42],[32.76,-9.23],[32.19,-8.93],[31.56,-8.76],[31.16,-8.59],[30.74,-8.34],[30.2,-7.08],[29.62,-6.52],[29.42,-5.94],[29.52,-5.42],[29.34,-4.5],[29.75,-4.45],[30.12,-4.09],[30.5,-3.57],[30.75,-3.36],[30.74,-3.03],[30.53,-2.81],[30.47,-2.41],[30.76,-2.29],[30.81,-1.7],[30.42,-1.14],[30.77,-1.01],[31.87,-1.03],[33.9,-0.95]],[[-8.67,27.66],[-8.66,27.59],[-8.69,27.4],[-8.69,25.88],[-11.97,25.93],[-11.94,23.37],[-12.88,23.29],[-13.12,22.77],[-12.93,21.33],[-16.85,21.33],[-17.06,21],[-17.02,21.42],[-17,21.42],[-14.75,21.5],[-14.63,21.86],[-14.22,22.31],[-13.89,23.69],[-12.5,24.77],[-12.03,26.03],[-11.72,26.1],[-11.39,26.88],[-10.55,26.99],[-10.19,26.86],[-9.74,26.86],[-9.41,27.09],[-8.79,27.12],[-8.82,27.66],[-8.67,27.66]],[[-122.84,49],[-127.99,51.72],[-130.54,54.8],[-133.35,58.41],[-137.45,58.91],[-140.99,66],[-135.63,69.32],[-129.11,69.78],[-124.43,70.16],[-119.94,69.38],[-115.3,67.9],[-107.79,67.89],[-105.34,68.56],[-98.44,67.78],[-95.49,68.09],[-96.39,71.19],[-92.41,69.7],[-88.32,67.87],[-84.1,69.81],[-81.26,67.6],[-86.07,66.06],[-90.7,63.61],[-94.63,60.11],[-90.9,57.29],[-85.01,55.3],[-81.4,52.16],[-79.83,54.67],[-77.3,58.05],[-77.41,62.55],[-71.68,61.53],[-68.37,58.8],[-63.81,59.44],[-59.57,55.2],[-55.76,53.27],[-60.03,50.24],[-67.24,49.51],[-68.65,48.3],[-64.8,46.99],[-60.45,46.28],[-65.36,43.55],[-67.14,45.14],[-69.24,47.45],[-71.4,45.25],[-76.38,44.1],[-79.17,43.47],[-81.28,42.21],[-83.12,42.08],[-82.55,45.35],[-84.09,46.28],[-84.78,46.64],[-88.38,48.3],[-92.61,48.45],[-95.15,49.38],[-107.05,49],[-120,49]],[[-83.99,62.45],[-83.25,62.91],[-81.88,62.9],[-81.9,62.71],[-83.07,62.16],[-83.77,62.18],[-83.99,62.45]],[[-79.77,72.8],[-80.88,73.33],[-80.83,73.69],[-80.35,73.76],[-78.06,73.65],[-76.34,73.1],[-76.25,72.83],[-77.32,72.86],[-78.39,72.88],[-79.49,72.74],[-79.77,72.8]],[[-80.32,62.09],[-79.93,62.38],[-79.52,62.36],[-79.27,62.16],[-79.66,61.63],[-80.1,61.72],[-80.36,62.02],[-80.32,62.09]],[[-93.61,74.98],[-94.16,74.59],[-95.61,74.67],[-96.82,74.93],[-96.29,75.38],[-94.85,75.65],[-93.98,75.3],[-93.61,74.98]],[[-93.84,77.52],[-94.29,77.49],[-96.17,77.56],[-96.44,77.83],[-94.42,77.82],[-93.72,77.63],[-93.84,77.52]],[[-96.75,78.77],[-95.56,78.42],[-95.83,78.06],[-97.31,77.85],[-98.12,78.08],[-98.55,78.46],[-98.63,78.87],[-97.34,78.83],[-96.75,78.77]],[[-88.15,74.39],[-89.77,74.52],[-92.42,74.84],[-92.77,75.39],[-92.89,75.88],[-93.89,76.32],[-95.96,76.44],[-97.12,76.75],[-96.75,77.16],[-94.68,77.1],[-93.57,76.78],[-91.6,76.78],[-90.74,76.45],[-90.97,76.07],[-89.82,75.85],[-89.19,75.61],[-87.84,75.57],[-86.38,75.48],[-84.79,75.7],[-82.75,75.78],[-81.13,75.71],[-80.06,75.34],[-79.83,74.92],[-80.46,74.66],[-81.95,74.44],[-83.23,74.56],[-86.1,74.41],[-88.15,74.39]],[[-111.26,78.15],[-109.85,78],[-110.19,77.7],[-112.05,77.41],[-113.53,77.73],[-112.73,78.05],[-111.26,78.15]],[[-110.96,78.8],[-109.66,78.6],[-110.88,78.41],[-112.54,78.41],[-112.52,78.55],[-111.5,78.85],[-110.96,78.8]],[[-55.6,51.32],[-56.13,50.69],[-56.8,49.81],[-56.14,50.15],[-55.47,49.94],[-55.82,49.59],[-54.93,49.31],[-54.47,49.56],[-53.48,49.25],[-53.79,48.52],[-53.09,48.69],[-52.96,48.16],[-52.65,47.54],[-53.07,46.66],[-53.52,46.62],[-54.18,46.81],[-53.96,47.63],[-54.24,47.75],[-55.4,46.88],[-56,46.92],[-55.29,47.39],[-56.25,47.63],[-57.33,47.57],[-59.27,47.6],[-59.42,47.9],[-58.8,48.25],[-59.23,48.52],[-58.39,49.13],[-57.36,50.72],[-56.74,51.29],[-55.87,51.63],[-55.41,51.59],[-55.6,51.32]],[[-83.88,65.11],[-82.79,64.77],[-81.64,64.45],[-81.55,63.98],[-80.82,64.06],[-80.1,63.73],[-80.99,63.41],[-82.55,63.65],[-83.11,64.1],[-84.1,63.57],[-85.52,63.05],[-85.87,63.64],[-87.22,63.54],[-86.35,64.04],[-86.23,64.82],[-85.88,65.74],[-85.16,65.66],[-84.98,65.22],[-84.46,65.37],[-83.88,65.11]],[[-78.77,72.35],[-75.61,72.24],[-74.1,71.33],[-71.2,70.92],[-67.92,70.12],[-68.81,68.72],[-64.86,67.85],[-61.85,66.86],[-63.92,65],[-66.72,66.39],[-68.14,65.69],[-65.73,64.65],[-64.67,63.39],[-66.27,62.95],[-67.37,62.88],[-66.17,61.93],[-71.02,62.91],[-71.89,63.68],[-74.84,64.68],[-77.71,64.23],[-77.9,65.31],[-73.96,65.46],[-73.95,66.31],[-72.93,67.73],[-74.84,68.55],[-76.23,69.15],[-78.17,69.83],[-79.49,69.87],[-84.94,69.97],[-88.68,70.41],[-88.47,71.22],[-90.2,72.24],[-88.41,73.54],[-86.56,73.16],[-84.85,73.34],[-80.6,72.72],[-78.77,72.35]],[[-94.5,74.13],[-92.42,74.1],[-90.51,73.86],[-92,72.97],[-93.2,72.77],[-94.27,72.02],[-95.41,72.06],[-96.03,72.94],[-96.02,73.44],[-95.5,73.86],[-94.5,74.13]],[[-122.86,76.12],[-121.16,76.86],[-119.11,77.51],[-117.57,77.5],[-116.2,77.65],[-116.34,76.88],[-117.11,76.53],[-118.04,76.48],[-119.9,76.05],[-121.5,75.9],[-122.86,76.12]],[[-132.71,54.04],[-131.75,54.12],[-132.05,52.98],[-131.18,52.18],[-131.58,52.18],[-132.18,52.64],[-132.55,53.1],[-133.06,53.41],[-133.24,53.85],[-133.18,54.17],[-132.71,54.04]],[[-105.49,79.3],[-103.53,79.16],[-100.82,78.8],[-100.06,78.33],[-99.67,77.91],[-101.3,78.02],[-102.95,78.34],[-105.18,78.38],[-104.21,78.68],[-105.42,78.92],[-105.49,79.3]],[[-123.51,48.51],[-124.01,48.37],[-125.65,48.83],[-125.96,49.18],[-126.85,49.53],[-127.03,49.81],[-128.06,50],[-128.44,50.54],[-128.36,50.77],[-127.31,50.55],[-126.69,50.4],[-125.75,50.29],[-125.42,49.95],[-124.92,49.48],[-123.92,49.06],[-123.51,48.51]],[[-121.54,74.45],[-120.11,74.24],[-117.56,74.19],[-116.59,73.9],[-115.51,73.47],[-116.77,73.22],[-119.22,72.52],[-120.46,71.82],[-120.46,71.38],[-123.09,70.9],[-123.62,71.34],[-125.93,71.87],[-125.5,72.29],[-124.81,73.02],[-123.94,73.68],[-124.92,74.29],[-121.54,74.45]],[[-107.82,75.85],[-106.93,76.01],[-105.88,75.97],[-105.71,75.48],[-106.31,75],[-109.7,74.85],[-112.22,74.42],[-113.74,74.39],[-113.87,74.72],[-111.79,75.16],[-116.31,75.04],[-117.71,75.22],[-116.35,76.2],[-115.4,76.48],[-112.59,76.14],[-110.81,75.55],[-109.07,75.47],[-110.5,76.43],[-109.58,76.79],[-108.55,76.68],[-108.21,76.2],[-107.82,75.85]],[[-106.52,73.08],[-105.4,72.67],[-104.77,71.7],[-104.46,70.99],[-102.79,70.5],[-100.98,70.03],[-101.09,69.59],[-102.73,69.5],[-102.09,69.12],[-102.43,68.75],[-104.24,68.91],[-105.96,69.18],[-107.12,69.12],[-109,68.78],[-111.53,68.63],[-113.31,68.54],[-113.86,69.01],[-115.22,69.28],[-116.11,69.17],[-117.34,69.96],[-116.68,70.07],[-115.13,70.24],[-113.72,70.19],[-112.42,70.37],[-114.35,70.6],[-116.49,70.52],[-117.91,70.54],[-118.43,70.91],[-116.11,71.31],[-117.65,71.29],[-119.4,71.56],[-118.56,72.31],[-117.87,72.71],[-115.19,73.31],[-114.17,73.12],[-114.67,72.65],[-112.44,72.95],[-111.05,72.45],[-109.92,72.96],[-109.01,72.63],[-108.19,71.65],[-107.69,72.06],[-108.4,73.09],[-107.52,73.24],[-106.52,73.08]],[[-100.44,72.71],[-101.54,73.36],[-100.36,73.84],[-99.16,73.63],[-97.38,73.76],[-97.12,73.47],[-98.05,72.99],[-96.54,72.56],[-96.72,71.66],[-98.36,71.27],[-99.32,71.36],[-100.01,71.74],[-102.5,72.51],[-102.48,72.83],[-100.44,72.71]],[[-106.6,73.6],[-105.26,73.64],[-104.5,73.42],[-105.38,72.76],[-106.94,73.46],[-106.6,73.6]],[[-98.5,76.72],[-97.74,76.26],[-97.7,75.74],[-98.16,75],[-99.81,74.9],[-100.88,75.06],[-100.86,75.64],[-102.5,75.56],[-102.57,76.34],[-101.49,76.31],[-99.98,76.65],[-98.58,76.59],[-98.5,76.72]],[[-96.01,80.6],[-95.32,80.91],[-94.3,80.98],[-94.74,81.21],[-92.41,81.26],[-91.13,80.72],[-89.45,80.51],[-87.81,80.32],[-87.02,79.66],[-85.82,79.34],[-87.19,79.04],[-89.03,78.29],[-90.81,78.22],[-92.88,78.34],[-93.95,78.75],[-93.94,79.11],[-93.15,79.38],[-94.97,79.37],[-96.08,79.7],[-96.71,80.16],[-96.01,80.6]],[[-91.59,81.9],[-88.93,82.12],[-85.5,82.65],[-83.18,82.32],[-81.1,83.02],[-76.25,83.17],[-72.83,83.23],[-68.5,83.11],[-63.68,82.9],[-61.89,82.36],[-66.75,81.73],[-65.48,81.51],[-69.47,80.62],[-73.24,79.63],[-76.91,79.32],[-76.22,79.02],[-76.34,78.18],[-78.36,77.51],[-79.62,76.98],[-77.89,76.78],[-83.17,76.45],[-87.6,76.42],[-89.62,76.95],[-88.26,77.9],[-84.98,77.54],[-87.96,78.37],[-85.38,79],[-86.51,79.74],[-84.2,80.21],[-81.85,80.46],[-87.6,80.52],[-90.2,81.26],[-91.59,81.9]],[[-75.22,67.44],[-75.87,67.15],[-76.99,67.1],[-77.24,67.59],[-76.81,68.15],[-75.89,68.29],[-75.11,68.01],[-75.1,67.58],[-75.22,67.44]],[[-96.26,69.49],[-95.65,69.11],[-96.27,68.76],[-97.62,69.06],[-98.43,68.95],[-99.8,69.4],[-98.92,69.71],[-98.22,70.14],[-97.16,69.86],[-96.56,69.68],[-96.26,69.49]],[[-64.52,49.87],[-64.17,49.96],[-62.86,49.71],[-61.84,49.29],[-61.81,49.11],[-62.29,49.09],[-63.59,49.4],[-64.52,49.87]],[[-64.01,47.04],[-63.66,46.55],[-62.94,46.42],[-62.01,46.44],[-62.51,46.03],[-62.87,45.97],[-64.14,46.39],[-64.39,46.73],[-64.01,47.04]],[[-122.84,49],[-113,49],[-100.65,49],[-94.82,49.39],[-92.61,48.45],[-89.27,48.02],[-85.65,47.22],[-84.61,46.44],[-83.89,46.12],[-82.55,45.35],[-82.9,42.43],[-82.69,41.67],[-78.94,42.86],[-78.72,43.62],[-76.38,44.1],[-71.51,45.01],[-70.3,45.91],[-68.23,47.35],[-66.97,44.81],[-70.65,43.09],[-70.08,41.78],[-70.64,41.48],[-72.88,41.22],[-73.35,40.63],[-73.96,40.43],[-75.2,39.25],[-75.06,38.4],[-75.72,37.94],[-76.33,38.08],[-75.97,36.9],[-77.4,34.51],[-79.2,33.16],[-81.49,30.73],[-80.53,28.04],[-80.38,25.21],[-81.71,25.87],[-82.65,28.55],[-85.11,29.64],[-87.53,30.27],[-89.41,29.89],[-89.78,29.31],[-92.5,29.55],[-95.6,28.74],[-97.38,26.69],[-98.24,26.06],[-100.11,28.11],[-102.48,29.76],[-104.71,30.12],[-106.51,31.75],[-111.02,31.33],[-115.99,32.61],[-118.41,33.74],[-120.37,34.45],[-122.55,37.55],[-123.86,39.77],[-124.53,42.77],[-124.08,46.86],[-123.12,48.04],[-122.84,49]],[[-155.4,20.08],[-155.22,19.99],[-155.06,19.86],[-154.81,19.51],[-154.83,19.45],[-155.22,19.24],[-155.54,19.08],[-155.69,18.92],[-155.94,19.06],[-155.91,19.34],[-156.07,19.7],[-156.02,19.81],[-155.85,19.98],[-155.92,20.17],[-155.86,20.27],[-155.79,20.25],[-155.4,20.08]],[[-155.99,20.76],[-156.08,20.64],[-156.42,20.57],[-156.59,20.78],[-156.7,20.86],[-156.71,20.93],[-156.61,21.01],[-156.26,20.92],[-155.99,20.76]],[[-156.76,21.18],[-156.79,21.07],[-157.33,21.1],[-157.25,21.22],[-156.76,21.18]],[[-158.03,21.72],[-157.94,21.65],[-157.65,21.32],[-157.71,21.26],[-157.78,21.28],[-158.13,21.31],[-158.25,21.54],[-158.29,21.58],[-158.03,21.72]],[[-159.36,22.22],[-159.35,21.98],[-159.47,21.88],[-159.8,22.06],[-159.75,22.14],[-159.59,22.24],[-159.36,22.22]],[[-166.47,60.38],[-165.68,60.29],[-165.58,59.91],[-166.19,59.75],[-166.85,59.94],[-167.45,60.21],[-166.47,60.38]],[[-153.23,57.97],[-152.56,57.9],[-152.14,57.59],[-153.01,57.12],[-154,56.74],[-154.52,56.99],[-154.67,57.46],[-153.76,57.82],[-153.23,57.97]],[[-140.99,69.71],[-140.01,60.28],[-137.45,58.91],[-134.95,59.27],[-132.73,57.69],[-129.98,55.28],[-131.97,55.5],[-134.08,58.12],[-137.8,58.5],[-142.57,60.08],[-147.11,60.89],[-148.57,59.91],[-151.72,59.16],[-150.35,61.03],[-152.58,60.06],[-154.23,58.15],[-156.56,56.98],[-159.6,55.57],[-162.24,55.02],[-164.94,54.57],[-161.81,55.9],[-158.68,57.02],[-157.55,58.33],[-158.52,58.79],[-159.98,58.57],[-161.97,58.67],[-162.52,59.99],[-165.35,60.51],[-165.73,62.08],[-163.75,63.22],[-161.54,63.46],[-161.52,64.4],[-162.45,64.56],[-164.96,64.45],[-168.11,65.67],[-163.65,66.58],[-162.49,66.73],[-165.39,68.04],[-164.43,68.91],[-161.91,70.33],[-158.12,70.82],[-154.34,70.7],[-152.27,70.6],[-147.61,70.21],[-143.59,70.15]],[[-171.73,63.78],[-171.12,63.59],[-170.49,63.69],[-169.68,63.43],[-168.69,63.3],[-168.77,63.19],[-169.53,62.98],[-170.29,63.19],[-170.67,63.38],[-171.55,63.32],[-171.79,63.41],[-171.73,63.78]],[[87.36,49.22],[85.77,48.46],[85.16,47],[82.46,45.54],[79.97,44.92],[80.18,42.92],[79.65,42.5],[77.66,42.96],[75.64,42.88],[73.64,43.09],[71.84,42.85],[70.96,42.27],[69.07,41.38],[68.26,40.66],[66.71,41.17],[66.02,41.99],[64.9,43.73],[62.01,43.5],[60.24,44.78],[58.5,45.59],[55.97,41.31],[54.75,42.04],[52.94,42.12],[52.45,42.03],[52.5,42.79],[50.89,44.03],[50.31,44.61],[51.32,45.25],[53.04,45.26],[53.04,46.85],[51.19,47.05],[49.1,46.4],[48.7,47.08],[47.31,47.72],[47.04,49.15],[47.55,50.45],[48.7,50.6],[52.33,51.72],[55.72,50.62],[58.36,51.06],[59.93,50.84],[61.59,51.27],[60.93,52.45],[61.7,52.98],[61.44,54.01],[65.67,54.6],[69.07,55.38],[71.18,54.13],[73.51,54.04],[74.39,53.55],[76.52,54.18],[80.03,50.87],[81.95,50.81],[83.94,50.89],[85.11,50.12],[86.83,49.83]],[[55.97,41.31],[55.93,45],[58.5,45.59],[58.69,45.5],[60.24,44.78],[61.06,44.41],[62.01,43.5],[63.19,43.65],[64.9,43.73],[66.1,43],[66.02,41.99],[66.51,41.99],[66.71,41.17],[67.98,41.14],[68.26,40.66],[68.63,40.67],[69.07,41.38],[70.39,42.08],[70.96,42.27],[71.26,42.17],[70.42,41.52],[71.16,41.14],[71.87,41.39],[73.05,40.87],[71.78,40.15],[71.01,40.24],[70.6,40.22],[70.46,40.5],[70.67,40.96],[69.33,40.73],[69.01,40.09],[68.54,39.53],[67.7,39.58],[67.44,39.14],[68.18,38.9],[68.39,38.16],[67.83,37.15],[67.07,37.36],[66.52,37.36],[66.54,37.97],[65.22,38.4],[64.17,38.89],[63.52,39.36],[62.38,40.05],[61.88,41.08],[61.55,41.27],[60.46,41.22],[60.08,41.43],[59.97,42.22],[58.63,42.75],[57.79,42.17],[56.93,41.83],[57.09,41.32],[55.97,41.31]],[[141,-2.6],[142.74,-3.29],[144.58,-3.86],[145.27,-4.37],[145.83,-4.88],[145.98,-5.47],[147.65,-6.08],[147.89,-6.61],[146.97,-6.72],[147.19,-7.39],[148.09,-8.04],[148.73,-9.11],[149.31,-9.07],[149.27,-9.51],[150.04,-9.68],[149.74,-9.87],[150.8,-10.29],[150.69,-10.58],[150.03,-10.65],[149.78,-10.39],[148.92,-10.28],[147.91,-10.13],[147.14,-9.49],[146.57,-8.94],[146.05,-8.07],[144.74,-7.63],[143.9,-7.92],[143.29,-8.25],[143.41,-8.98],[142.63,-9.33],[142.07,-9.16],[141.03,-9.12],[141.02,-5.86],[141,-2.6]],[[152.64,-3.66],[153.02,-3.98],[153.14,-4.5],[152.83,-4.77],[152.64,-4.18],[152.41,-3.79],[151.95,-3.46],[151.38,-3.04],[150.66,-2.74],[150.94,-2.5],[151.48,-2.78],[151.82,-3],[152.24,-3.24],[152.64,-3.66]],[[151.3,-5.84],[150.75,-6.08],[150.24,-6.32],[149.71,-6.32],[148.89,-6.03],[148.32,-5.75],[148.4,-5.44],[149.3,-5.58],[149.85,-5.51],[150,-5.03],[150.14,-5],[150.24,-5.53],[150.81,-5.46],[151.09,-5.11],[151.65,-4.76],[151.54,-4.17],[152.14,-4.15],[152.34,-4.31],[152.32,-4.87],[151.98,-5.48],[151.46,-5.56],[151.3,-5.84]],[[154.76,-5.34],[155.06,-5.57],[155.55,-6.2],[156.02,-6.54],[155.88,-6.82],[155.6,-6.92],[155.17,-6.54],[154.73,-5.9],[154.52,-5.14],[154.65,-5.04],[154.76,-5.34]],[[141,-2.6],[141.02,-5.86],[141.03,-9.12],[140.14,-8.3],[139.13,-8.1],[138.88,-8.38],[137.61,-8.41],[138.04,-7.6],[138.67,-7.32],[138.41,-6.23],[137.93,-5.39],[135.99,-4.55],[135.17,-4.46],[133.66,-3.54],[133.37,-4.02],[132.98,-4.11],[132.76,-3.75],[132.75,-3.31],[131.99,-2.82],[133.07,-2.46],[133.78,-2.48],[133.7,-2.21],[132.23,-2.21],[131.84,-1.62],[130.94,-1.43],[130.52,-0.94],[131.87,-0.7],[132.38,-0.37],[133.98,-0.78],[134.14,-1.15],[134.42,-2.77],[135.46,-3.37],[136.29,-2.31],[137.44,-1.7],[138.33,-1.7],[139.19,-2.05],[139.93,-2.41],[141,-2.6]],[[124.97,-8.89],[125.07,-9.09],[125.09,-9.39],[124.44,-10.14],[123.58,-10.36],[123.46,-10.24],[123.55,-9.9],[123.98,-9.29],[124.97,-8.89]],[[134.21,-6.89],[134.11,-6.14],[134.29,-5.78],[134.5,-5.44],[134.73,-5.74],[134.73,-6.21],[134.21,-6.89]],[[117.88,4.14],[117.31,3.24],[118.05,2.29],[117.87,1.83],[119,0.9],[117.81,0.78],[117.48,0.1],[117.52,-0.8],[116.56,-1.49],[116.53,-2.48],[116.15,-4.01],[116,-3.66],[114.86,-4.11],[114.47,-3.5],[113.76,-3.44],[113.26,-3.12],[112.07,-3.48],[111.7,-3],[111.05,-3.05],[110.22,-2.93],[110.07,-1.59],[109.57,-1.31],[109.09,-0.46],[108.95,0.42],[109.07,1.34],[109.66,2.01],[109.83,1.34],[110.52,0.77],[111.16,0.98],[111.8,0.9],[112.38,1.41],[112.86,1.5],[113.81,1.22],[114.62,1.43],[115.13,2.82],[115.52,3.17],[115.87,4.31],[117.01,4.31],[117.88,4.14]],[[129.37,-2.8],[130.47,-3.09],[130.83,-3.86],[129.99,-3.45],[129.16,-3.36],[128.59,-3.43],[127.9,-3.39],[128.13,-2.84],[129.37,-2.8]],[[126.87,-3.79],[126.18,-3.61],[125.99,-3.18],[127,-3.13],[127.25,-3.46],[126.87,-3.79]],[[127.93,2.17],[128,1.63],[128.6,1.54],[128.69,1.13],[128.63,0.26],[128.12,0.36],[127.97,-0.25],[128.38,-0.78],[128.1,-0.9],[127.7,-0.27],[127.4,1.01],[127.6,1.81],[127.93,2.17]],[[122.93,0.88],[124.08,0.92],[125.07,1.64],[125.24,1.42],[124.44,0.43],[123.68,0.24],[122.72,0.43],[121.06,0.38],[120.18,0.24],[120.04,-0.52],[120.93,-1.41],[121.47,-0.96],[123.34,-0.62],[123.26,-1.08],[122.82,-0.93],[122.39,-1.52],[121.51,-1.91],[122.45,-3.19],[122.27,-3.53],[123.17,-4.68],[123.16,-5.34],[122.63,-5.63],[122.24,-5.28],[122.72,-4.46],[121.74,-4.85],[121.49,-4.57],[121.62,-4.19],[120.9,-3.6],[120.97,-2.63],[120.3,-2.93],[120.39,-4.1],[120.43,-5.53],[119.8,-5.67],[119.37,-5.38],[119.65,-4.46],[119.5,-3.49],[119.08,-3.49],[118.77,-2.8],[119.18,-2.15],[119.32,-1.35],[119.83,0.15],[120.03,0.57],[120.89,1.31],[121.67,1.01],[122.93,0.88]],[[120.29,-10.26],[118.97,-9.56],[119.9,-9.36],[120.43,-9.67],[120.78,-9.97],[120.71,-10.24],[120.29,-10.26]],[[121.34,-8.54],[122.01,-8.46],[122.9,-8.09],[122.76,-8.65],[121.25,-8.93],[119.92,-8.81],[119.92,-8.45],[120.71,-8.24],[121.34,-8.54]],[[118.26,-8.36],[118.88,-8.28],[119.13,-8.71],[117.97,-8.91],[117.28,-9.04],[116.74,-9.03],[117.08,-8.46],[117.63,-8.45],[117.9,-8.09],[118.26,-8.36]],[[108.49,-6.42],[108.62,-6.78],[110.54,-6.88],[110.76,-6.46],[112.61,-6.95],[112.98,-7.59],[114.48,-7.78],[115.71,-8.37],[114.57,-8.75],[113.46,-8.35],[112.56,-8.38],[111.52,-8.3],[110.59,-8.12],[109.43,-7.74],[108.69,-7.64],[108.28,-7.77],[106.45,-7.36],[106.28,-6.93],[105.36,-6.85],[106.05,-5.9],[107.26,-5.96],[108.07,-6.35],[108.49,-6.42]],[[104.37,-1.08],[104.54,-1.78],[104.89,-2.34],[105.62,-2.43],[106.11,-3.06],[105.86,-4.31],[105.82,-5.85],[104.71,-5.87],[103.87,-5.04],[102.58,-4.22],[102.16,-3.61],[101.4,-2.8],[100.9,-2.05],[100.14,-0.65],[99.26,0.18],[98.97,1.04],[98.6,1.82],[97.7,2.45],[97.18,3.31],[96.43,3.87],[95.38,4.97],[95.29,5.48],[95.94,5.44],[97.48,5.25],[98.37,4.27],[99.14,3.59],[99.69,3.17],[100.64,2.1],[101.66,2.08],[102.5,1.4],[103.08,0.56],[103.84,0.1],[103.44,-0.71],[104.01,-1.06],[104.37,-1.08]],[[-68.63,-52.64],[-68.25,-53.1],[-67.75,-53.85],[-66.45,-54.45],[-65.05,-54.7],[-65.5,-55.2],[-66.45,-55.25],[-66.96,-54.9],[-67.56,-54.87],[-68.63,-54.87],[-68.63,-52.64]],[[-57.62,-30.22],[-58.14,-32.04],[-58.35,-33.26],[-58.5,-34.43],[-57.36,-35.98],[-56.79,-36.9],[-59.23,-38.72],[-62.34,-38.83],[-62.33,-40.17],[-62.75,-41.03],[-64.73,-40.8],[-64.98,-42.06],[-63.75,-42.04],[-64.38,-42.87],[-65.33,-44.5],[-66.51,-45.04],[-67.58,-46.3],[-65.64,-47.24],[-67.17,-48.7],[-68.73,-50.27],[-68.82,-51.77],[-68.57,-52.3],[-71.92,-52.01],[-72.31,-50.68],[-73.33,-50.38],[-72.65,-48.88],[-72.45,-47.74],[-71.55,-45.56],[-71.22,-44.78],[-71.79,-44.21],[-71.92,-43.41],[-71.75,-42.05],[-71.68,-39.81],[-70.81,-38.55],[-71.12,-36.66],[-70.39,-35.17],[-69.81,-33.27],[-70.53,-31.36],[-70.02,-29.37],[-69,-27.52],[-68.59,-26.51],[-68.42,-24.52],[-66.98,-22.99],[-66.27,-21.83],[-64.38,-22.8],[-62.85,-22.03],[-60.85,-23.88],[-58.81,-24.77],[-57.63,-25.6],[-57.61,-27.4],[-55.69,-27.39],[-54.63,-25.74],[-53.63,-26.12],[-54.49,-27.47],[-56.29,-28.85]],[[-68.63,-52.64],[-68.63,-54.87],[-67.56,-54.87],[-66.96,-54.9],[-67.29,-55.3],[-68.15,-55.61],[-68.64,-55.58],[-69.23,-55.5],[-69.96,-55.2],[-71.01,-55.05],[-72.27,-54.49],[-73.28,-53.96],[-74.66,-52.84],[-73.84,-53.05],[-72.43,-53.72],[-71.11,-54.07],[-70.59,-53.62],[-70.27,-52.93],[-69.35,-52.52],[-68.63,-52.64]],[[-69.59,-17.58],[-68.97,-18.98],[-68.76,-20.37],[-67.83,-22.87],[-66.98,-22.99],[-68.42,-24.52],[-68.59,-26.51],[-69,-27.52],[-70.02,-29.37],[-70.53,-31.36],[-69.81,-33.27],[-70.39,-35.17],[-71.12,-36.66],[-70.81,-38.55],[-71.68,-39.81],[-71.75,-42.05],[-71.92,-43.41],[-71.79,-44.21],[-71.22,-44.78],[-71.55,-45.56],[-72.45,-47.74],[-72.65,-48.88],[-73.33,-50.38],[-72.31,-50.68],[-71.92,-52.01],[-68.57,-52.3],[-69.94,-52.54],[-71.01,-53.83],[-72.56,-53.53],[-74.95,-52.26],[-74.98,-51.04],[-75.61,-48.67],[-74.13,-46.94],[-74.69,-45.76],[-73.24,-44.45],[-73.39,-42.12],[-74.33,-43.23],[-73.68,-39.94],[-73.51,-38.28],[-73.17,-37.12],[-71.86,-33.91],[-71.67,-30.92],[-71.49,-28.86],[-70.72,-25.71],[-70.09,-21.39],[-70.37,-18.35],[-69.59,-17.58]],[[29.34,-4.5],[29.62,-6.52],[30.35,-8.24],[28.45,-9.16],[28.37,-11.79],[29.62,-12.18],[28.52,-12.7],[27.16,-11.61],[25.42,-11.33],[24.26,-10.95],[22.84,-11.02],[22.21,-9.89],[21.95,-8.31],[20.51,-7.3],[20.04,-7.12],[19.02,-7.99],[17.47,-8.07],[16.57,-6.62],[13.02,-5.98],[12.18,-5.79],[12.63,-4.99],[13.6,-4.5],[14.58,-4.97],[16.01,-3.54],[16.86,-1.23],[17.66,-0.06],[17.9,1.74],[18.45,3.5],[19.47,5.03],[21.66,4.22],[22.84,4.71],[24.81,4.9],[25.65,5.26],[27.37,5.23],[28.7,4.46],[29.95,4.17],[31.17,2.2],[30.09,1.06],[29.59,-0.59],[29.26,-2.21],[29.28,-3.29]],[[41.59,-1.68],[40.99,-0.86],[40.98,2.78],[41.86,3.92],[42.13,4.23],[42.77,4.25],[43.66,4.96],[44.96,5],[47.79,8],[48.49,8.84],[48.94,9.45],[48.94,9.97],[48.94,10.98],[48.94,11.39],[48.95,11.41],[49.27,11.43],[49.73,11.58],[50.26,11.68],[50.73,12.02],[51.11,12.02],[51.13,11.75],[51.04,11.17],[51.05,10.64],[50.83,10.28],[50.55,9.2],[50.07,8.08],[49.45,6.8],[48.6,5.34],[47.74,4.22],[46.56,2.86],[45.56,2.05],[44.07,1.05],[43.14,0.29],[42.04,-0.92],[41.81,-1.45],[41.59,-1.68]],[[39.2,-4.68],[37.77,-3.68],[37.7,-3.1],[34.07,-1.06],[33.9,-0.95],[33.89,0.11],[34.18,0.52],[34.67,1.18],[35.04,1.91],[34.59,3.05],[34.48,3.55],[34,4.25],[34.62,4.85],[35.3,5.51],[35.82,5.34],[35.82,4.78],[36.16,4.45],[36.86,4.45],[38.12,3.6],[38.44,3.59],[38.67,3.62],[38.89,3.5],[39.56,3.42],[39.85,3.84],[40.77,4.26],[41.17,3.92],[41.86,3.92],[40.98,2.78],[40.99,-0.86],[41.59,-1.68],[40.88,-2.08],[40.64,-2.5],[40.26,-2.57],[40.12,-3.28],[39.8,-3.68],[39.61,-4.35],[39.2,-4.68]],[[24.57,8.23],[23.46,8.95],[23.56,9.68],[22.98,10.71],[22.88,11.38],[22.5,12.26],[21.94,12.59],[22.3,13.37],[22.51,14.09],[22.57,14.94],[23.89,15.61],[23.85,20],[25,22],[32.9,22],[37.19,21.02],[37.11,19.81],[37.86,18.37],[37.9,17.43],[36.85,16.96],[36.32,14.82],[36.27,13.56],[35.26,12.08],[34.73,10.91],[33.96,9.58],[33.96,9.46],[33.84,9.98],[33.21,10.72],[33.21,12.18],[32.68,12.02],[32.32,11.68],[31.85,10.53],[30.84,9.71],[29.62,10.08],[29,9.6],[27.97,9.4],[27.11,9.64],[26.48,9.55],[25.79,10.41],[24.8,9.81],[24.19,8.73],[24.57,8.23]],[[23.84,19.58],[23.89,15.61],[23.02,15.68],[22.57,14.94],[22.3,14.33],[22.51,14.09],[22.18,13.79],[22.3,13.37],[22.04,12.96],[21.94,12.59],[22.29,12.65],[22.5,12.26],[22.51,11.68],[22.88,11.38],[22.87,11.14],[22.23,10.97],[21.72,10.57],[21,9.48],[20.06,9.01],[19.09,9.07],[18.81,8.98],[18.91,8.63],[18.39,8.28],[17.97,7.89],[16.71,7.51],[16.46,7.74],[16.29,7.75],[16.1,7.5],[15.28,7.42],[15.44,7.69],[15.12,8.38],[14.98,8.8],[14.55,8.97],[13.96,9.55],[14.17,10.02],[14.63,9.92],[14.91,9.99],[15.47,9.98],[14.92,10.89],[14.96,11.56],[14.9,12.22],[14.5,12.86],[14.6,13.33],[13.96,13.35],[13.96,14],[13.54,14.37],[13.97,15.68],[15.25,16.63],[15.3,17.93],[15.69,19.96],[15.9,20.39],[15.49,20.73],[15.47,21.05],[15.1,21.31],[14.85,22.86],[15.86,23.41],[19.85,21.49],[23.84,19.58]],[[-71.71,19.71],[-71.62,19.17],[-71.7,18.78],[-71.94,18.62],[-71.69,18.32],[-71.71,18.04],[-72.37,18.21],[-72.84,18.14],[-73.45,18.22],[-73.92,18.03],[-74.46,18.34],[-74.37,18.66],[-73.45,18.53],[-72.69,18.45],[-72.33,18.67],[-72.79,19.1],[-72.78,19.48],[-73.41,19.64],[-73.19,19.92],[-72.58,19.87],[-71.71,19.71]],[[-71.71,18.04],[-71.69,18.32],[-71.94,18.62],[-71.7,18.78],[-71.62,19.17],[-71.71,19.71],[-71.59,19.88],[-70.81,19.88],[-70.21,19.62],[-69.95,19.65],[-69.77,19.29],[-69.22,19.31],[-69.26,19.01],[-68.81,18.98],[-68.32,18.61],[-68.69,18.21],[-69.17,18.42],[-69.62,18.38],[-69.95,18.43],[-70.13,18.25],[-70.52,18.18],[-70.67,18.43],[-71,18.28],[-71.4,17.6],[-71.66,17.76],[-71.71,18.04]],[[93.78,81.03],[95.94,81.25],[97.88,80.75],[100.19,79.78],[99.94,78.88],[97.76,78.76],[94.97,79.04],[93.31,79.43],[92.54,80.14],[91.18,80.34],[93.78,81.03]],[[102.84,79.28],[105.37,78.71],[105.08,78.31],[99.44,77.92],[101.26,79.23],[102.09,79.35],[102.84,79.28]],[[138.83,76.14],[141.47,76.09],[145.09,75.56],[144.3,74.82],[140.62,74.85],[138.96,74.61],[136.98,75.26],[137.51,75.95],[138.83,76.14]],[[148.22,75.35],[150.73,75.08],[149.58,74.69],[147.98,74.78],[146.12,75.17],[146.36,75.5],[148.22,75.35]],[[139.86,73.37],[140.81,73.77],[142.06,73.86],[143.48,73.47],[143.6,73.21],[142.09,73.21],[140.04,73.32],[139.86,73.37]],[[44.85,80.59],[46.8,80.77],[48.32,80.78],[48.52,80.51],[49.1,80.75],[50.04,80.92],[51.52,80.7],[51.14,80.55],[49.79,80.42],[48.89,80.34],[48.75,80.18],[47.59,80.01],[46.5,80.25],[47.07,80.56],[44.85,80.59]],[[22.73,54.33],[20.89,54.31],[19.66,54.43],[19.89,54.87],[21.27,55.19],[22.31,55.02],[22.76,54.86],[22.65,54.58],[22.73,54.33]],[[53.51,73.75],[55.9,74.63],[55.63,75.08],[57.87,75.61],[61.17,76.25],[64.5,76.44],[66.21,76.81],[68.16,76.94],[68.85,76.54],[68.18,76.23],[64.64,75.74],[61.58,75.26],[58.48,74.31],[56.99,73.33],[55.42,72.37],[55.62,71.54],[57.53,70.72],[56.94,70.63],[53.68,70.76],[53.41,71.21],[51.6,71.47],[51.46,72.02],[52.48,72.23],[52.44,72.78],[54.43,73.63],[53.51,73.75]],[[142.92,53.7],[143.26,52.74],[143.24,51.76],[143.65,50.75],[144.65,48.98],[143.18,49.31],[142.56,47.86],[143.54,46.84],[143.51,46.14],[142.75,46.74],[142.09,45.97],[141.91,46.81],[142.02,47.78],[141.9,48.86],[142.13,49.61],[142.18,50.95],[141.59,51.94],[141.68,53.3],[142.61,53.76],[142.21,54.23],[142.65,54.37],[142.92,53.7]],[[130.78,42.22],[133.77,46.12],[129.4,49.44],[122.24,53.43],[117.88,49.51],[109.4,49.29],[102.07,51.26],[94.82,50.01],[86.83,49.83],[80.03,50.87],[71.18,54.13],[61.7,52.98],[58.36,51.06],[47.55,50.45],[49.1,46.4],[47.81,41.15],[43.76,42.74],[37.4,45.41],[39.74,47.9],[36.62,50.23],[32.72,52.24],[32.69,53.35],[29.9,55.79],[27.42,58.72],[30.04,63.55],[29.4,69.16],[40.02,66.27],[37.01,63.85],[43.02,66.42],[45.56,67.57],[53.49,68.2],[60.55,69.85],[67.26,69.93],[71.85,71.41],[72.82,66.53],[74.4,70.63],[75.9,71.87],[86.82,73.94],[96.68,75.92],[106.97,76.97],[110.15,74.48],[118.78,73.59],[128.46,71.98],[139.87,71.49],[159.83,70.45],[170.82,69.01],[-174.93,67.21],[-172.56,64.46],[-178.9,65.74],[178.31,64.08],[172.15,60.95],[163.22,59.21],[160.37,54.34],[155.92,56.77],[163.26,62.47],[151.26,58.78],[136.7,54.6],[140.51,50.05],[132.91,42.8]],[[-180,71.52],[-179.87,71.56],[-179.02,71.56],[-177.58,71.27],[-177.66,71.13],[-178.69,70.89],[-180,70.83],[178.9,70.78],[178.73,71.1],[-180,71.52]],[[33.44,45.97],[33.7,46.22],[34.41,46],[34.73,45.97],[34.86,45.77],[35.01,45.74],[35.02,45.65],[35.51,45.41],[36.53,45.47],[36.33,45.11],[35.24,44.94],[33.88,44.36],[33.33,44.57],[33.55,45.03],[32.45,45.33],[32.63,45.52],[33.59,45.85],[33.44,45.97]],[[-78.98,26.79],[-78.51,26.87],[-77.85,26.84],[-77.82,26.58],[-78.91,26.42],[-78.98,26.79]],[[-77.79,27.04],[-77,26.59],[-77.17,25.88],[-77.36,26.01],[-77.34,26.53],[-77.79,26.93],[-77.79,27.04]],[[-78.19,25.21],[-77.89,25.17],[-77.54,24.34],[-77.54,23.76],[-77.78,23.71],[-78.03,24.29],[-78.41,24.57],[-78.19,25.21]],[[-61.2,-51.85],[-60,-51.25],[-59.15,-51.5],[-58.55,-51.1],[-57.75,-51.55],[-58.05,-51.9],[-59.4,-52.2],[-59.85,-51.85],[-60.7,-52.3],[-61.2,-51.85]],[[15.14,79.67],[15.52,80.02],[16.99,80.05],[18.25,79.7],[21.54,78.96],[19.03,78.56],[18.47,77.83],[17.6,77.64],[17.12,76.81],[15.91,76.77],[13.76,77.38],[14.67,77.74],[13.17,78.02],[11.22,78.87],[10.45,79.65],[13.17,80.01],[13.72,79.66],[15.14,79.67]],[[31.1,69.56],[29.4,69.16],[28.59,69.07],[29.01,69.77],[27.73,70.16],[26.18,69.83],[25.69,69.09],[24.73,68.65],[23.66,68.89],[22.36,68.84],[21.25,69.37],[20.64,69.11],[20.03,69.07],[19.88,68.41],[17.99,68.57],[17.73,68.01],[16.77,68.01],[16.11,67.3],[15.11,66.19],[13.56,64.79],[13.92,64.44],[13.57,64.05],[12.58,64.07],[11.93,63.13],[11.99,61.8],[12.63,61.29],[12.3,60.12],[11.47,59.43],[11.03,58.86],[10.36,59.47],[8.38,58.31],[7.05,58.08],[5.66,58.59],[5.31,59.66],[4.99,61.97],[5.91,62.62],[8.55,63.45],[10.53,64.49],[12.36,65.88],[14.76,67.81],[16.44,68.56],[19.18,69.82],[21.38,70.26],[23.02,70.2],[24.55,71.03],[26.37,70.99],[28.16,71.19],[31.29,70.45],[30,70.19],[31.1,69.56]],[[27.41,80.06],[25.93,79.52],[23.02,79.4],[20.08,79.57],[19.9,79.84],[18.46,79.86],[17.37,80.32],[20.46,80.6],[21.91,80.36],[22.92,80.66],[25.45,80.41],[27.41,80.06]],[[24.72,77.85],[22.49,77.45],[20.73,77.68],[21.41,77.93],[20.81,78.25],[22.88,78.46],[23.28,78.08],[24.72,77.85]],[[-46.76,82.63],[-38.62,83.55],[-20.85,82.73],[-31.9,82.2],[-24.85,81.79],[-23.17,81.15],[-12.77,81.72],[-16.85,80.35],[-18.9,79.4],[-18.47,76.98],[-19.83,76.1],[-19.37,74.3],[-20.76,73.46],[-22.31,72.63],[-24.79,72.33],[-21.75,70.66],[-25.54,71.43],[-23.73,70.18],[-27.75,68.47],[-32.81,67.74],[-37.04,65.94],[-40.67,64.84],[-42.82,62.68],[-43.38,60.1],[-48.26,60.86],[-51.63,63.63],[-53.66,66.1],[-52.98,68.36],[-50.87,69.93],[-53.46,69.28],[-54.36,70.82],[-53.11,71.2],[-55.83,71.66],[-56.12,73.65],[-58.59,75.52],[-66.07,76.14],[-71.4,77.01],[-71.04,77.64],[-69.37,78.91],[-68.02,80.12],[-62.24,81.32],[-57.21,82.19],[-50.39,82.44],[-44.52,81.66]],[[68.94,-48.62],[69.58,-48.94],[70.53,-49.07],[70.56,-49.25],[70.28,-49.71],[68.74,-49.77],[68.72,-49.24],[68.87,-48.83],[68.94,-48.62]],[[124.97,-8.89],[125.09,-8.66],[125.95,-8.43],[126.64,-8.4],[126.96,-8.27],[127.34,-8.4],[126.97,-8.67],[125.93,-9.11],[125.09,-9.39],[125.07,-9.09],[124.97,-8.89]],[[16.35,-28.58],[17.22,-28.36],[17.84,-28.86],[19,-28.97],[19.9,-24.77],[20.76,-25.87],[20.89,-26.83],[22.11,-26.28],[22.83,-25.5],[23.73,-25.39],[25.03,-25.72],[25.77,-25.17],[26.49,-24.62],[27.12,-23.58],[29.43,-22.09],[30.32,-22.27],[31.19,-22.25],[31.93,-24.37],[31.84,-25.84],[31.04,-25.73],[30.68,-26.4],[31.28,-27.29],[32.07,-26.73],[32.58,-27.47],[32.2,-28.75],[31.33,-29.4],[30.62,-30.42],[28.92,-32.17],[27.46,-33.23],[25.91,-33.67],[25.17,-33.8],[23.59,-33.79],[22.57,-33.86],[20.69,-34.42],[19.61,-34.82],[18.86,-34.44],[18.38,-34.14],[18.25,-33.28],[18.25,-32.43],[17.57,-30.73],[17.06,-29.88]],[[28.98,-28.96],[28.54,-28.65],[28.07,-28.85],[27.53,-29.24],[27,-29.88],[27.75,-30.64],[28.11,-30.55],[28.29,-30.23],[28.85,-30.07],[29.02,-29.74],[29.32,-29.26],[28.98,-28.96]],[[28.98,-28.96],[29.32,-29.26],[29.02,-29.74],[28.85,-30.07],[28.29,-30.23],[28.11,-30.55],[27.75,-30.64],[27,-29.88],[27.53,-29.24],[28.07,-28.85],[28.54,-28.65],[28.98,-28.96]],[[-117.13,32.53],[-114.81,32.52],[-109.04,31.34],[-106.51,31.75],[-105.04,30.64],[-103.94,29.27],[-101.66,29.78],[-100.11,28.11],[-99.02,26.37],[-97.14,25.87],[-97.78,22.93],[-97.39,21.41],[-96.29,19.32],[-94.43,18.14],[-92.04,18.71],[-90.53,19.87],[-89.6,21.26],[-87.05,21.54],[-87.38,20.26],[-87.59,19.04],[-88.3,18.5],[-89.03,18],[-90.07,17.82],[-91.45,17.25],[-90.6,16.47],[-91.75,16.07],[-92.2,14.83],[-93.88,15.94],[-96.05,15.75],[-98.01,16.11],[-100.83,17.17],[-102.48,17.98],[-104.99,19.32],[-105.4,20.53],[-105.27,21.42],[-106.03,22.77],[-108.4,25.17],[-109.29,26.44],[-110.64,27.86],[-112.23,28.96],[-113.17,30.79],[-114.21,31.52],[-114.77,30.91],[-113.59,29.06],[-113.14,28.41],[-112.46,27.53],[-111.29,25.73],[-110.66,24.3],[-109.41,23.36],[-110.03,22.82],[-111.67,24.49],[-112.3,26.01],[-113.6,26.64],[-115.06,27.72],[-114.2,28.12],[-115.52,29.56],[-116.72,31.64]],[[-57.62,-30.22],[-56.98,-30.11],[-55.97,-30.88],[-55.6,-30.85],[-54.57,-31.49],[-53.79,-32.05],[-53.21,-32.73],[-53.65,-33.2],[-53.37,-33.77],[-53.81,-34.4],[-54.93,-34.95],[-55.67,-34.75],[-56.22,-34.86],[-57.14,-34.43],[-57.82,-34.46],[-58.43,-33.91],[-58.35,-33.26],[-58.13,-33.04],[-58.14,-32.04],[-57.88,-31.02],[-57.62,-30.22]],[[-53.37,-33.77],[-54.57,-31.49],[-57.62,-30.22],[-53.65,-26.92],[-54.43,-25.16],[-55.03,-24],[-55.8,-22.36],[-57.87,-20.73],[-57.67,-18.96],[-58.39,-16.88],[-60.25,-15.08],[-61.08,-13.48],[-63.2,-12.63],[-65.44,-10.51],[-68.05,-10.71],[-70.09,-11.12],[-72.19,-10.05],[-73.57,-8.42],[-73.12,-6.63],[-71.75,-4.59],[-69.44,-1.56],[-70.02,0.54],[-69.8,1.09],[-67.26,1.72],[-65.55,0.79],[-64.08,1.92],[-64.41,3.13],[-63.89,4.02],[-60.97,4.54],[-59.98,5.01],[-59.82,3.61],[-59.03,1.32],[-57.66,1.68],[-56,1.82],[-55.57,2.42],[-53.78,2.38],[-52.56,2.5],[-51.07,3.65],[-50.7,0.22],[-47.82,-0.58],[-44.58,-2.69],[-38.5,-3.7],[-35.24,-5.46],[-35.64,-9.65],[-38.67,-13.06],[-39.27,-17.87],[-40.95,-21.94],[-44.65,-23.35],[-48.49,-25.88],[-48.89,-28.67],[-52.26,-32.25]],[[-69.53,-10.95],[-68.79,-11.04],[-68.27,-11.01],[-68.05,-10.71],[-67.17,-10.31],[-66.65,-9.93],[-65.34,-9.76],[-65.44,-10.51],[-65.32,-10.9],[-65.4,-11.57],[-64.32,-12.46],[-63.2,-12.63],[-62.8,-13],[-62.13,-13.2],[-61.71,-13.49],[-61.08,-13.48],[-60.5,-13.78],[-60.46,-14.35],[-60.26,-14.65],[-60.25,-15.08],[-60.54,-15.09],[-60.16,-16.26],[-58.24,-16.3],[-58.39,-16.88],[-58.28,-17.27],[-57.74,-17.55],[-57.5,-18.17],[-57.67,-18.96],[-57.95,-19.4],[-57.85,-19.97],[-58.17,-20.18],[-58.18,-19.87],[-59.11,-19.36],[-60.04,-19.34],[-61.79,-19.63],[-62.26,-20.51],[-62.29,-21.05],[-62.69,-22.25],[-62.85,-22.03],[-63.99,-21.99],[-64.38,-22.8],[-64.96,-22.08],[-66.27,-21.83],[-67.11,-22.74],[-67.83,-22.87],[-68.22,-21.49],[-68.76,-20.37],[-68.44,-19.4],[-68.97,-18.98],[-69.1,-18.26],[-69.59,-17.58],[-68.96,-16.5],[-69.39,-15.66],[-69.16,-15.32],[-69.34,-14.95],[-68.95,-14.45],[-68.93,-13.6],[-68.88,-12.9],[-68.67,-12.56],[-69.53,-10.95]],[[-69.89,-4.3],[-70.93,-4.4],[-72.89,-5.28],[-73.22,-6.09],[-73.72,-6.92],[-73.99,-7.52],[-73.01,-9.03],[-72.56,-9.52],[-71.3,-10.08],[-70.55,-11.01],[-69.53,-10.95],[-68.88,-12.9],[-68.95,-14.45],[-69.16,-15.32],[-68.96,-16.5],[-69.86,-18.09],[-71.38,-17.77],[-73.45,-16.36],[-76.01,-14.65],[-76.26,-13.53],[-78.09,-10.38],[-79.45,-7.93],[-80.54,-6.54],[-80.93,-5.69],[-81.1,-4.04],[-80.19,-3.82],[-80.44,-4.43],[-79.62,-4.45],[-78.64,-4.55],[-77.84,-3],[-75.54,-1.56],[-75.37,-0.15],[-74.44,-0.53],[-73.66,-1.26],[-72.33,-2.44],[-71.41,-2.34],[-70.05,-2.72],[-70.39,-3.77]],[[-66.88,1.25],[-67.26,1.72],[-67.87,1.69],[-69.8,1.09],[-69.25,0.6],[-70.02,0.54],[-69.58,-0.55],[-69.44,-1.56],[-70.39,-3.77],[-70.05,-2.72],[-71.41,-2.34],[-72.33,-2.44],[-73.66,-1.26],[-74.44,-0.53],[-75.37,-0.15],[-76.29,0.42],[-77.42,0.39],[-77.86,0.81],[-78.99,1.69],[-78.66,2.27],[-77.93,2.7],[-77.13,3.85],[-77.31,4.67],[-77.32,5.84],[-77.88,7.22],[-77.43,7.64],[-77.47,8.52],[-76.84,8.64],[-75.67,9.44],[-75.48,10.62],[-74.28,11.1],[-73.41,11.23],[-72.24,11.96],[-71.4,12.38],[-71.33,11.78],[-72.23,11.11],[-72.91,10.45],[-73.31,9.15],[-72.66,8.63],[-72.36,8],[-72.45,7.42],[-71.96,6.99],[-70.09,6.96],[-68.99,6.21],[-67.7,6.27],[-67.52,5.56],[-67.82,4.5],[-67.34,3.54],[-67.81,2.82],[-67.18,2.25]],[[-77.35,8.67],[-77.47,8.52],[-77.24,7.94],[-77.43,7.64],[-77.75,7.71],[-77.88,7.22],[-78.22,7.51],[-78.43,8.05],[-78.18,8.32],[-78.44,8.39],[-78.62,8.72],[-79.12,9],[-79.56,8.93],[-79.76,8.59],[-80.16,8.33],[-80.38,8.3],[-80.48,8.09],[-80.01,7.55],[-80.28,7.42],[-80.42,7.27],[-80.89,7.22],[-81.06,7.82],[-81.19,7.65],[-81.52,7.71],[-81.72,8.11],[-82.13,8.18],[-82.39,8.29],[-82.82,8.29],[-82.85,8.07],[-82.96,8.22],[-82.91,8.42],[-82.83,8.63],[-82.87,8.81],[-82.72,8.93],[-82.93,9.07],[-82.93,9.48],[-82.55,9.57],[-82.19,9.21],[-82.21,8.99],[-81.81,8.95],[-81.72,9.03],[-81.44,8.79],[-80.95,8.86],[-80.52,9.11],[-79.92,9.31],[-79.57,9.61],[-79.02,9.55],[-79.06,9.46],[-78.5,9.42],[-78.05,9.25],[-77.73,8.95],[-77.35,8.67]],[[-82.55,9.57],[-82.93,9.48],[-82.93,9.07],[-82.72,8.93],[-82.87,8.81],[-82.83,8.63],[-82.91,8.42],[-82.96,8.22],[-83.51,8.45],[-83.71,8.66],[-83.59,8.83],[-83.63,9.05],[-83.91,9.29],[-84.3,9.49],[-84.65,9.62],[-84.71,9.91],[-84.98,10.09],[-84.91,9.8],[-85.11,9.56],[-85.34,9.83],[-85.66,9.93],[-85.8,10.14],[-85.79,10.44],[-85.66,10.76],[-85.94,10.9],[-85.71,11.09],[-85.56,11.22],[-84.9,10.95],[-84.67,11.08],[-84.35,11],[-84.19,10.79],[-83.89,10.73],[-83.66,10.94],[-83.4,10.4],[-83.02,9.99],[-82.55,9.57]],[[-83.66,10.94],[-83.89,10.73],[-84.19,10.79],[-84.35,11],[-84.67,11.08],[-84.9,10.95],[-85.56,11.22],[-85.71,11.09],[-86.06,11.4],[-86.53,11.81],[-86.74,12.14],[-87.17,12.46],[-87.67,12.91],[-87.56,13.06],[-87.39,12.91],[-87.32,12.98],[-87.01,13.03],[-86.88,13.26],[-86.73,13.26],[-86.76,13.75],[-86.52,13.78],[-86.31,13.77],[-86.1,14.04],[-85.8,13.84],[-85.7,13.96],[-85.51,14.08],[-85.16,14.36],[-85.15,14.56],[-85.05,14.55],[-84.92,14.79],[-84.82,14.82],[-84.65,14.67],[-84.45,14.62],[-84.23,14.75],[-83.98,14.75],[-83.63,14.88],[-83.49,15.02],[-83.15,15],[-83.23,14.9],[-83.29,14.68],[-83.18,14.31],[-83.41,13.97],[-83.52,13.57],[-83.55,13.13],[-83.5,12.87],[-83.47,12.42],[-83.63,12.32],[-83.72,11.89],[-83.65,11.63],[-83.85,11.37],[-83.81,11.1],[-83.66,10.94]],[[-83.15,15],[-83.49,15.02],[-83.63,14.88],[-83.98,14.75],[-84.23,14.75],[-84.45,14.62],[-84.65,14.67],[-84.82,14.82],[-84.92,14.79],[-85.05,14.55],[-85.15,14.56],[-85.16,14.36],[-85.51,14.08],[-85.7,13.96],[-85.8,13.84],[-86.1,14.04],[-86.31,13.77],[-86.52,13.78],[-86.76,13.75],[-86.73,13.26],[-86.88,13.26],[-87.01,13.03],[-87.32,12.98],[-87.49,13.3],[-87.79,13.38],[-87.72,13.78],[-87.86,13.89],[-88.07,13.96],[-88.51,13.85],[-88.54,13.98],[-88.84,14.14],[-89.06,14.34],[-89.35,14.42],[-89.15,14.68],[-89.23,14.87],[-89.15,15.07],[-88.68,15.35],[-88.22,15.73],[-88.12,15.69],[-87.9,15.86],[-87.62,15.88],[-87.52,15.8],[-87.37,15.85],[-86.9,15.76],[-86.44,15.78],[-86.12,15.89],[-86,16.01],[-85.68,15.95],[-85.45,15.89],[-85.18,15.91],[-84.98,16],[-84.53,15.86],[-84.37,15.83],[-84.06,15.65],[-83.77,15.42],[-83.41,15.27],[-83.15,15]],[[-89.35,14.42],[-89.06,14.34],[-88.84,14.14],[-88.54,13.98],[-88.51,13.85],[-88.07,13.96],[-87.86,13.89],[-87.72,13.78],[-87.79,13.38],[-87.9,13.15],[-88.48,13.16],[-88.84,13.26],[-89.26,13.46],[-89.81,13.52],[-90.1,13.74],[-90.06,13.88],[-89.72,14.13],[-89.53,14.25],[-89.59,14.36],[-89.35,14.42]],[[-92.23,14.54],[-92.2,14.83],[-92.09,15.06],[-92.23,15.25],[-91.75,16.07],[-90.46,16.07],[-90.44,16.41],[-90.6,16.47],[-90.71,16.69],[-91.08,16.92],[-91.45,17.25],[-91,17.25],[-91,17.82],[-90.07,17.82],[-89.14,17.81],[-89.15,17.02],[-89.23,15.89],[-88.93,15.89],[-88.61,15.71],[-88.52,15.85],[-88.22,15.73],[-88.68,15.35],[-89.15,15.07],[-89.23,14.87],[-89.15,14.68],[-89.35,14.42],[-89.59,14.36],[-89.53,14.25],[-89.72,14.13],[-90.06,13.88],[-90.1,13.74],[-90.61,13.91],[-91.23,13.93],[-91.69,14.13],[-92.23,14.54]],[[-89.14,17.81],[-89.15,17.96],[-89.03,18],[-88.85,17.88],[-88.49,18.49],[-88.3,18.5],[-88.3,18.35],[-88.11,18.35],[-88.12,18.08],[-88.29,17.64],[-88.2,17.49],[-88.3,17.13],[-88.24,17.04],[-88.35,16.53],[-88.55,16.27],[-88.73,16.23],[-88.93,15.89],[-89.23,15.89],[-89.15,17.02],[-89.14,17.81]],[[-60.73,5.2],[-60.97,4.54],[-62.8,4.01],[-63.89,4.02],[-64.82,4.06],[-64.41,3.13],[-63.42,2.41],[-64.08,1.92],[-64.61,1.33],[-65.55,0.79],[-66.88,1.25],[-67.45,2.6],[-67.3,3.32],[-67.62,3.84],[-67.74,5.22],[-67.34,6.1],[-68.27,6.15],[-69.39,6.1],[-70.67,7.09],[-72.2,7.34],[-72.48,7.63],[-72.44,8.41],[-72.79,9.08],[-73.03,9.74],[-72.61,10.82],[-71.97,11.61],[-71.36,11.54],[-71.62,10.97],[-72.07,9.86],[-71.26,9.14],[-71.35,10.21],[-70.16,11.38],[-69.94,12.16],[-68.88,11.44],[-68.19,10.56],[-66.23,10.65],[-64.89,10.08],[-64.32,10.64],[-61.88,10.72],[-62.39,9.95],[-60.83,9.38],[-60.15,8.6],[-60.55,7.78],[-60.3,7.04],[-61.16,6.7],[-61.41,5.96]],[[-56.54,1.9],[-56.78,1.86],[-57.34,1.95],[-57.66,1.68],[-58.11,1.51],[-58.43,1.46],[-58.54,1.27],[-59.03,1.32],[-59.65,1.79],[-59.72,2.25],[-59.97,2.76],[-59.82,3.61],[-59.54,3.96],[-59.77,4.42],[-60.11,4.58],[-59.98,5.01],[-60.21,5.24],[-60.73,5.2],[-61.41,5.96],[-61.14,6.23],[-61.16,6.7],[-60.54,6.86],[-60.3,7.04],[-60.64,7.42],[-60.55,7.78],[-59.76,8.37],[-59.1,8],[-58.48,7.35],[-58.46,6.83],[-58.08,6.81],[-57.54,6.32],[-57.15,5.97],[-57.31,5.07],[-57.92,4.81],[-57.86,4.58],[-58.05,4.06],[-57.6,3.33],[-57.28,3.33],[-57.15,2.77],[-56.54,1.9]],[[-54.52,2.31],[-55.1,2.52],[-55.57,2.42],[-55.97,2.51],[-56.07,2.22],[-55.91,2.02],[-56,1.82],[-56.54,1.9],[-57.15,2.77],[-57.28,3.33],[-57.6,3.33],[-58.05,4.06],[-57.86,4.58],[-57.92,4.81],[-57.31,5.07],[-57.15,5.97],[-55.95,5.77],[-55.84,5.95],[-55.03,6.03],[-53.96,5.76],[-54.48,4.9],[-54.4,4.21],[-54.01,3.62],[-54.18,3.19],[-54.27,2.73],[-54.52,2.31]],[[-51.66,4.16],[-52.25,3.24],[-52.56,2.5],[-52.94,2.12],[-53.42,2.05],[-53.56,2.33],[-53.78,2.38],[-54.09,2.11],[-54.52,2.31],[-54.27,2.73],[-54.18,3.19],[-54.01,3.62],[-54.4,4.21],[-54.48,4.9],[-53.96,5.76],[-53.62,5.65],[-52.88,5.41],[-51.82,4.57],[-51.66,4.16]],[[6.19,49.46],[6.66,49.2],[8.1,49.02],[7.59,48.33],[7.47,47.62],[7.19,47.45],[6.74,47.54],[6.77,47.29],[6.04,46.73],[6.02,46.27],[6.5,46.43],[6.84,45.99],[6.8,45.71],[7.1,45.33],[6.75,45.03],[7.01,44.25],[7.55,44.13],[7.44,43.69],[6.53,43.13],[4.56,43.4],[3.1,43.07],[2.99,42.47],[1.83,42.34],[0.7,42.8],[0.34,42.58],[-1.5,43.03],[-1.9,43.42],[-1.38,44.02],[-1.19,46.01],[-2.23,47.06],[-2.96,47.57],[-4.49,47.95],[-4.59,48.68],[-3.3,48.9],[-1.62,48.64],[-1.94,49.78],[-0.99,49.35],[1.34,50.13],[1.64,50.95],[2.51,51.15],[2.66,50.8],[3.12,50.78],[3.59,50.38],[4.29,49.91],[4.8,49.99],[5.68,49.53],[5.9,49.44],[6.19,49.46]],[[8.75,42.63],[9.39,43.01],[9.56,42.15],[9.23,41.38],[8.78,41.58],[8.54,42.26],[8.75,42.63]],[[-75.37,-0.15],[-75.24,-0.91],[-75.54,-1.56],[-76.64,-2.61],[-77.84,-3],[-78.45,-3.87],[-78.64,-4.55],[-79.21,-4.96],[-79.62,-4.45],[-80.03,-4.35],[-80.44,-4.43],[-80.47,-4.06],[-80.19,-3.82],[-80.3,-3.4],[-79.77,-2.66],[-79.99,-2.22],[-80.37,-2.69],[-80.97,-2.25],[-80.77,-1.96],[-80.93,-1.06],[-80.59,-0.91],[-80.4,-0.28],[-80.02,0.36],[-80.09,0.77],[-79.54,0.98],[-78.86,1.38],[-77.86,0.81],[-77.67,0.83],[-77.42,0.39],[-76.58,0.26],[-76.29,0.42],[-75.8,0.09],[-75.37,-0.15]],[[-66.28,18.52],[-65.77,18.43],[-65.59,18.23],[-65.85,17.98],[-66.6,17.98],[-67.19,17.95],[-67.24,18.37],[-67.1,18.52],[-66.28,18.52]],[[-77.57,18.49],[-76.89,18.4],[-76.37,18.16],[-76.2,17.89],[-76.9,17.87],[-77.2,17.7],[-77.77,17.86],[-78.34,18.23],[-78.22,18.45],[-77.8,18.52],[-77.57,18.49]],[[-82.27,23.19],[-81.41,23.12],[-80.62,23.11],[-79.68,22.77],[-79.28,22.4],[-78.35,22.51],[-77.99,22.28],[-77.15,21.66],[-76.52,21.21],[-76.19,21.22],[-75.6,21.02],[-75.67,20.73],[-74.93,20.69],[-74.18,20.28],[-74.3,20.05],[-74.96,19.92],[-75.63,19.87],[-76.32,19.95],[-77.76,19.86],[-77.09,20.41],[-77.49,20.67],[-78.14,20.74],[-78.48,21.03],[-78.72,21.6],[-79.29,21.56],[-80.22,21.83],[-80.52,22.04],[-81.82,22.19],[-82.17,22.39],[-81.79,22.64],[-82.78,22.69],[-83.49,22.17],[-83.91,22.15],[-84.05,21.91],[-84.55,21.8],[-84.97,21.9],[-84.45,22.21],[-84.23,22.57],[-83.78,22.79],[-83.27,22.98],[-82.51,23.08],[-82.27,23.19]],[[31.19,-22.25],[30.66,-22.15],[30.32,-22.27],[29.84,-22.1],[29.43,-22.09],[28.79,-21.64],[28.02,-21.49],[27.73,-20.85],[27.73,-20.5],[27.3,-20.39],[26.16,-19.29],[25.85,-18.71],[25.65,-18.54],[25.26,-17.74],[26.38,-17.85],[26.71,-17.96],[27.05,-17.94],[27.6,-17.29],[28.47,-16.47],[28.83,-16.39],[28.95,-16.04],[29.52,-15.65],[30.27,-15.51],[30.34,-15.88],[31.17,-15.86],[31.64,-16.07],[31.85,-16.32],[32.33,-16.39],[32.85,-16.71],[32.85,-17.98],[32.65,-18.67],[32.61,-19.42],[32.77,-19.72],[32.66,-20.31],[32.51,-20.39],[32.24,-21.12],[31.19,-22.25]],[[29.43,-22.09],[28.02,-22.83],[27.12,-23.58],[26.79,-24.24],[26.49,-24.62],[25.94,-24.7],[25.77,-25.17],[25.67,-25.49],[25.03,-25.72],[24.21,-25.67],[23.73,-25.39],[23.31,-25.27],[22.83,-25.5],[22.58,-25.98],[22.11,-26.28],[21.61,-26.73],[20.89,-26.83],[20.67,-26.48],[20.76,-25.87],[20.17,-24.92],[19.9,-24.77],[19.9,-21.85],[20.88,-21.81],[20.91,-18.25],[21.66,-18.22],[23.2,-17.87],[23.58,-18.28],[24.22,-17.89],[24.52,-17.89],[25.08,-17.66],[25.26,-17.74],[25.65,-18.54],[25.85,-18.71],[26.16,-19.29],[27.3,-20.39],[27.73,-20.5],[27.73,-20.85],[28.02,-21.49],[28.79,-21.64],[29.43,-22.09]],[[19.9,-24.77],[19.9,-28.46],[19,-28.97],[18.47,-29.05],[17.84,-28.86],[17.39,-28.78],[17.22,-28.36],[16.82,-28.08],[16.35,-28.58],[15.6,-27.82],[15.21,-27.09],[14.99,-26.12],[14.74,-25.39],[14.41,-23.85],[14.38,-22.66],[14.26,-22.11],[13.87,-21.7],[13.35,-20.87],[12.83,-19.67],[12.61,-19.05],[11.8,-18.07],[11.73,-17.3],[12.22,-17.11],[12.81,-16.94],[13.46,-16.97],[14.06,-17.42],[14.21,-17.35],[18.26,-17.31],[18.96,-17.79],[21.38,-17.93],[23.21,-17.52],[24.04,-17.3],[24.68,-17.35],[25.08,-17.58],[25.08,-17.66],[24.52,-17.89],[24.22,-17.89],[23.58,-18.28],[23.2,-17.87],[21.66,-18.22],[20.91,-18.25],[20.88,-21.81],[19.9,-21.85],[19.9,-24.77]],[[-16.71,13.6],[-17.13,14.37],[-17.62,14.73],[-17.18,14.92],[-16.7,15.62],[-16.46,16.14],[-16.12,16.46],[-15.62,16.37],[-15.14,16.59],[-14.58,16.6],[-14.1,16.3],[-13.44,16.04],[-12.83,15.3],[-12.17,14.62],[-12.12,13.99],[-11.93,13.42],[-11.55,13.14],[-11.47,12.75],[-11.51,12.44],[-11.66,12.39],[-12.2,12.47],[-12.28,12.35],[-12.5,12.33],[-13.22,12.58],[-13.7,12.59],[-15.55,12.63],[-15.82,12.52],[-16.15,12.55],[-16.68,12.39],[-16.84,13.15],[-15.93,13.13],[-15.69,13.27],[-15.51,13.28],[-15.14,13.51],[-14.71,13.3],[-14.28,13.28],[-13.84,13.51],[-14.05,13.79],[-14.38,13.63],[-14.69,13.63],[-15.08,13.88],[-15.4,13.86],[-15.63,13.62],[-16.71,13.6]],[[-11.51,12.44],[-11.55,13.14],[-12.12,13.99],[-11.84,14.8],[-11.35,15.41],[-10.09,15.33],[-9.55,15.49],[-5.32,16.2],[-5.97,20.64],[-4.92,24.97],[1.82,20.61],[2.68,19.86],[3.16,19.06],[4.27,16.85],[3.64,15.57],[1.38,15.32],[0.38,14.93],[-0.52,15.12],[-2,14.56],[-2.97,13.8],[-3.52,13.34],[-4.28,13.23],[-5.22,11.71],[-5.47,10.95],[-5.82,10.22],[-6.2,10.52],[-6.67,10.43],[-7.62,10.15],[-8.03,10.21],[-8.28,10.79],[-8.62,10.81],[-8.38,11.39],[-8.9,12.09],[-9.33,12.33],[-9.89,12.06],[-10.59,11.92],[-11.04,12.21],[-11.46,12.08]],[[-17.06,21],[-16.85,21.33],[-12.93,21.33],[-13.12,22.77],[-12.88,23.29],[-11.94,23.37],[-11.97,25.93],[-8.69,25.88],[-8.69,27.4],[-4.92,24.97],[-6.45,24.96],[-5.97,20.64],[-5.49,16.33],[-5.32,16.2],[-5.54,15.5],[-9.55,15.49],[-9.7,15.26],[-10.09,15.33],[-10.65,15.13],[-11.35,15.41],[-11.67,15.39],[-11.84,14.8],[-12.17,14.62],[-12.83,15.3],[-13.44,16.04],[-14.1,16.3],[-14.58,16.6],[-15.14,16.59],[-15.62,16.37],[-16.12,16.46],[-16.46,16.14],[-16.55,16.67],[-16.27,17.17],[-16.15,18.11],[-16.26,19.1],[-16.38,19.59],[-16.28,20.09],[-16.54,20.57],[-17.06,21]],[[2.69,6.26],[1.87,6.14],[1.62,6.83],[1.67,9.13],[1.46,9.34],[1.42,9.83],[1.08,10.18],[0.77,10.47],[0.9,11],[1.24,11.11],[1.45,11.55],[1.94,11.64],[2.15,11.94],[2.49,12.23],[2.85,12.24],[3.61,11.66],[3.57,11.33],[3.8,10.73],[3.6,10.33],[3.71,10.06],[3.22,9.44],[2.91,9.14],[2.72,8.51],[2.75,7.87],[2.69,6.26]],[[14.85,22.86],[15.1,21.31],[15.47,21.05],[15.49,20.73],[15.9,20.39],[15.69,19.96],[15.3,17.93],[15.25,16.63],[13.97,15.68],[13.54,14.37],[13.96,14],[13.96,13.35],[14.6,13.33],[14.5,12.86],[14.21,12.8],[14.18,12.48],[14,12.46],[13.32,13.56],[13.08,13.6],[12.3,13.04],[11.53,13.33],[10.99,13.39],[10.7,13.25],[10.11,13.28],[9.52,12.85],[9.02,12.83],[7.8,13.34],[7.33,13.1],[6.82,13.11],[6.45,13.49],[5.44,13.87],[4.37,13.75],[4.11,13.53],[3.97,12.96],[3.68,12.55],[3.61,11.66],[2.85,12.24],[2.49,12.23],[2.15,11.94],[2.18,12.63],[1.02,12.85],[0.99,13.34],[0.43,13.99],[0.3,14.44],[0.38,14.93],[1.02,14.97],[1.38,15.32],[2.75,15.41],[3.64,15.57],[3.72,16.18],[4.27,16.85],[4.27,19.16],[5.68,19.6],[8.57,21.57],[12,23.47],[13.58,23.04],[14.14,22.49],[14.85,22.86]],[[2.69,6.26],[2.75,7.87],[2.72,8.51],[2.91,9.14],[3.22,9.44],[3.71,10.06],[3.6,10.33],[3.8,10.73],[3.57,11.33],[3.61,11.66],[3.68,12.55],[3.97,12.96],[4.11,13.53],[4.37,13.75],[5.44,13.87],[6.45,13.49],[6.82,13.11],[7.33,13.1],[7.8,13.34],[9.02,12.83],[9.52,12.85],[10.11,13.28],[10.7,13.25],[10.99,13.39],[11.53,13.33],[12.3,13.04],[13.08,13.6],[13.32,13.56],[14,12.46],[14.18,12.48],[14.58,12.09],[14.47,11.9],[14.42,11.57],[13.57,10.8],[13.31,10.16],[13.17,9.64],[12.95,9.42],[12.75,8.72],[12.22,8.31],[12.07,7.8],[11.84,7.4],[11.75,6.98],[11.06,6.64],[10.5,7.06],[10.12,7.04],[9.52,6.45],[9.23,6.44],[8.76,5.48],[8.5,4.77],[7.46,4.41],[7.08,4.46],[6.7,4.24],[5.9,4.26],[5.36,4.89],[5.03,5.61],[4.33,6.27],[3.57,6.26],[2.69,6.26]],[[14.5,12.86],[14.96,11.56],[15.47,9.98],[14.63,9.92],[13.96,9.55],[14.98,8.8],[15.44,7.69],[14.78,6.41],[14.46,5.45],[14.48,4.73],[15.04,3.85],[15.86,3.01],[16.01,2.27],[15.15,1.96],[13.08,2.27],[12.36,2.19],[11.28,2.26],[9.79,3.07],[8.95,3.9],[8.49,4.5],[8.76,5.48],[9.52,6.45],[10.5,7.06],[11.75,6.98],[12.07,7.8],[12.75,8.72],[13.17,9.64],[13.57,10.8],[14.47,11.9],[14.18,12.48],[14.5,12.86]],[[0.9,11],[0.77,10.47],[1.08,10.18],[1.42,9.83],[1.46,9.34],[1.67,9.13],[1.62,6.83],[1.87,6.14],[1.06,5.93],[0.84,6.28],[0.57,6.91],[0.49,7.41],[0.71,8.31],[0.46,8.68],[0.37,9.47],[0.37,10.19],[-0.05,10.71],[0.02,11.02],[0.9,11]],[[0.02,11.02],[-0.05,10.71],[0.37,10.19],[0.37,9.47],[0.46,8.68],[0.71,8.31],[0.49,7.41],[0.57,6.91],[0.84,6.28],[1.06,5.93],[-0.51,5.34],[-1.06,5],[-1.96,4.71],[-2.86,5],[-2.81,5.39],[-3.25,6.25],[-2.98,7.38],[-2.56,8.22],[-2.83,9.64],[-2.96,10.39],[-2.94,10.96],[-1.2,11.01],[-0.76,10.94],[-0.44,11.1],[0.02,11.02]],[[-8.03,10.21],[-7.9,10.3],[-7.62,10.15],[-6.85,10.14],[-6.67,10.43],[-6.49,10.41],[-6.2,10.52],[-6.05,10.1],[-5.82,10.22],[-5.41,10.37],[-4.96,10.15],[-4.78,9.82],[-4.33,9.61],[-3.98,9.86],[-3.51,9.9],[-2.83,9.64],[-2.56,8.22],[-2.98,7.38],[-3.25,6.25],[-2.81,5.39],[-2.86,5],[-3.31,4.98],[-4.01,5.18],[-4.65,5.17],[-5.83,4.99],[-6.53,4.71],[-7.52,4.34],[-7.71,4.36],[-7.63,5.19],[-7.54,5.31],[-7.57,5.71],[-7.99,6.13],[-8.31,6.19],[-8.6,6.47],[-8.39,6.91],[-8.49,7.4],[-8.44,7.69],[-8.28,7.69],[-8.22,8.12],[-8.3,8.32],[-8.2,8.45],[-7.83,8.58],[-8.08,9.38],[-8.31,9.79],[-8.23,10.13],[-8.03,10.21]],[[-13.7,12.59],[-12.5,12.33],[-12.2,12.47],[-11.51,12.44],[-11.3,12.08],[-10.87,12.18],[-10.16,11.84],[-9.57,12.19],[-9.13,12.31],[-8.79,11.81],[-8.58,11.14],[-8.41,10.91],[-8.34,10.49],[-8.23,10.13],[-8.08,9.38],[-8.2,8.45],[-8.22,8.12],[-8.44,7.69],[-8.93,7.31],[-9.41,7.53],[-9.75,8.54],[-10.23,8.41],[-10.5,8.72],[-10.62,9.27],[-11.12,10.05],[-12.15,9.86],[-12.6,9.62],[-13.25,8.9],[-14.07,9.89],[-14.58,10.22],[-14.84,10.88],[-14.69,11.53],[-14.12,11.68],[-13.74,11.81],[-13.72,12.25]],[[-16.68,12.39],[-16.15,12.55],[-15.82,12.52],[-15.55,12.63],[-13.7,12.59],[-13.72,12.25],[-13.83,12.14],[-13.74,11.81],[-13.9,11.68],[-14.12,11.68],[-14.38,11.51],[-14.69,11.53],[-15.13,11.04],[-15.67,11.46],[-16.09,11.53],[-16.31,11.81],[-16.31,11.96],[-16.61,12.17],[-16.68,12.39]],[[-8.44,7.69],[-8.49,7.4],[-8.39,6.91],[-8.6,6.47],[-8.31,6.19],[-7.99,6.13],[-7.57,5.71],[-7.54,5.31],[-7.63,5.19],[-7.71,4.36],[-7.98,4.36],[-9.01,4.83],[-9.91,5.59],[-10.77,6.14],[-11.44,6.79],[-11.2,7.11],[-11.15,7.4],[-10.69,7.94],[-10.23,8.41],[-10.02,8.43],[-9.75,8.54],[-9.34,7.93],[-9.41,7.53],[-9.21,7.31],[-8.93,7.31],[-8.72,7.71],[-8.44,7.69]],[[-13.25,8.9],[-12.71,9.34],[-12.6,9.62],[-12.43,9.84],[-12.15,9.86],[-11.92,10.05],[-11.12,10.05],[-10.84,9.69],[-10.62,9.27],[-10.65,8.98],[-10.5,8.72],[-10.51,8.35],[-10.23,8.41],[-10.69,7.94],[-11.15,7.4],[-11.2,7.11],[-11.44,6.79],[-11.71,6.86],[-12.43,7.26],[-12.95,7.8],[-13.12,8.16],[-13.25,8.9]],[[-5.41,10.37],[-5.47,10.95],[-5.2,11.37],[-5.22,11.71],[-4.43,12.54],[-4.28,13.23],[-4.01,13.47],[-3.52,13.34],[-3.11,13.54],[-2.97,13.8],[-2.19,14.25],[-2,14.56],[-1.07,14.97],[-0.52,15.12],[-0.26,14.92],[0.38,14.93],[0.3,14.44],[0.43,13.99],[0.99,13.34],[1.02,12.85],[2.18,12.63],[2.15,11.94],[1.94,11.64],[1.45,11.55],[1.24,11.11],[0.9,11],[0.02,11.02],[-0.44,11.1],[-0.76,10.94],[-1.2,11.01],[-2.94,10.96],[-2.96,10.39],[-2.83,9.64],[-3.51,9.9],[-3.98,9.86],[-4.33,9.61],[-4.78,9.82],[-4.96,10.15],[-5.41,10.37]],[[27.37,5.23],[26.4,5.15],[25.28,5.17],[24.81,4.9],[23.3,4.61],[22.7,4.63],[21.66,4.22],[20.29,4.69],[18.93,4.71],[18.45,3.5],[17.13,3.73],[16.01,2.27],[15.86,3.01],[15.04,3.85],[14.48,4.73],[14.46,5.45],[14.78,6.41],[16.1,7.5],[16.46,7.74],[17.97,7.89],[18.91,8.63],[19.09,9.07],[21,9.48],[22.23,10.97],[22.98,10.71],[23.56,9.68],[23.46,8.95],[24.57,8.23],[25.12,7.5],[26.21,6.55],[27.21,5.55]],[[18.45,3.5],[18.39,2.9],[18.1,2.37],[17.9,1.74],[17.78,0.86],[17.83,0.29],[17.66,-0.06],[17.64,-0.42],[17.52,-0.74],[16.86,-1.23],[16.41,-1.74],[15.97,-2.71],[16.01,-3.54],[15.75,-3.86],[15.17,-4.34],[14.58,-4.97],[14.21,-4.79],[14.15,-4.51],[13.6,-4.5],[13.26,-4.88],[12.99,-4.78],[12.62,-4.44],[12.32,-4.61],[11.91,-5.04],[11.09,-3.98],[11.86,-3.43],[11.48,-2.77],[11.82,-2.51],[12.49,-2.39],[12.58,-1.95],[13.11,-2.43],[13.99,-2.47],[14.3,-2],[14.43,-1.33],[14.32,-0.55],[13.84,0.04],[14.28,1.2],[14.03,1.4],[13.28,1.31],[13,1.83],[13.08,2.27],[14.34,2.23],[15.15,1.96],[15.94,1.73],[16.01,2.27],[16.54,3.2],[17.13,3.73],[17.81,3.56],[18.45,3.5]],[[11.28,2.26],[11.75,2.33],[12.36,2.19],[12.95,2.32],[13.08,2.27],[13,1.83],[13.28,1.31],[14.03,1.4],[14.28,1.2],[13.84,0.04],[14.32,-0.55],[14.43,-1.33],[14.3,-2],[13.99,-2.47],[13.11,-2.43],[12.58,-1.95],[12.49,-2.39],[11.82,-2.51],[11.48,-2.77],[11.86,-3.43],[11.09,-3.98],[10.07,-2.97],[9.41,-2.14],[8.8,-1.11],[8.83,-0.78],[9.05,-0.46],[9.29,0.27],[9.49,1.01],[9.83,1.07],[11.28,1.06],[11.28,2.26]],[[9.65,2.28],[11.28,2.26],[11.28,1.06],[9.83,1.07],[9.49,1.01],[9.3,1.16],[9.65,2.28]],[[30.74,-8.34],[31.56,-8.76],[32.76,-9.23],[33.49,-10.53],[33.11,-11.61],[32.99,-12.78],[33.22,-13.97],[30.27,-15.51],[28.95,-16.04],[28.47,-16.47],[27.05,-17.94],[26.38,-17.85],[25.08,-17.66],[24.68,-17.35],[23.21,-17.52],[21.89,-16.08],[24.02,-12.91],[24.08,-12.19],[24.02,-11.24],[24.26,-10.95],[24.78,-11.24],[25.75,-11.78],[27.16,-11.61],[28.15,-12.27],[28.94,-13.25],[29.62,-12.18],[28.64,-11.97],[28.5,-10.79],[28.45,-9.16],[29,-8.41],[30.74,-8.34]],[[32.76,-9.23],[33.74,-9.42],[33.94,-9.69],[34.28,-10.16],[34.56,-11.52],[34.28,-12.28],[34.56,-13.58],[34.91,-13.57],[35.27,-13.89],[35.69,-14.61],[35.77,-15.9],[35.34,-16.11],[35.03,-16.8],[34.38,-16.18],[34.31,-15.48],[34.52,-15.01],[34.46,-14.61],[34.07,-14.36],[33.79,-14.45],[33.22,-13.97],[32.69,-13.71],[32.99,-12.78],[33.31,-12.44],[33.11,-11.61],[33.32,-10.8],[33.49,-10.53],[33.23,-9.68],[32.76,-9.23]],[[34.56,-11.52],[36.51,-11.72],[37.47,-11.57],[38.43,-11.29],[40.32,-10.32],[40.44,-11.76],[40.6,-14.2],[40.48,-15.41],[39.45,-16.72],[37.41,-17.59],[35.9,-18.84],[34.79,-19.78],[35.18,-21.25],[35.39,-22.14],[35.53,-23.07],[35.61,-23.71],[35.04,-24.48],[33.01,-25.36],[32.66,-26.15],[32.83,-26.74],[31.98,-26.29],[31.75,-25.48],[31.67,-23.66],[32.24,-21.12],[32.66,-20.31],[32.61,-19.42],[32.85,-17.98],[32.33,-16.39],[31.64,-16.07],[30.34,-15.88],[30.18,-14.8],[33.79,-14.45],[34.46,-14.61],[34.31,-15.48],[35.03,-16.8],[35.77,-15.9],[35.27,-13.89],[34.56,-13.58],[34.56,-11.52]],[[32.07,-26.73],[31.87,-27.18],[31.28,-27.29],[30.68,-26.74],[30.68,-26.4],[30.95,-26.02],[31.04,-25.73],[31.33,-25.66],[31.84,-25.84],[31.98,-26.29],[32.07,-26.73]],[[12.99,-4.78],[12.63,-4.99],[12.47,-5.25],[12.44,-5.68],[12.18,-5.79],[11.91,-5.04],[12.32,-4.61],[12.62,-4.44],[12.99,-4.78]],[[12.32,-6.1],[13.02,-5.98],[16.33,-5.88],[16.86,-7.22],[17.47,-8.07],[18.46,-7.85],[19.17,-7.74],[20.04,-7.12],[20.6,-6.94],[21.73,-7.29],[21.95,-8.31],[21.88,-9.52],[22.16,-11.08],[22.84,-11.02],[23.91,-10.93],[23.9,-11.72],[23.93,-12.57],[21.93,-12.9],[22.56,-16.9],[21.38,-17.93],[18.26,-17.31],[14.06,-17.42],[12.81,-16.94],[11.73,-17.3],[11.78,-15.79],[12.18,-14.45],[12.74,-13.14],[13.64,-12.04],[13.69,-10.73],[13.12,-9.77],[12.93,-8.96],[12.93,-7.6],[12.23,-6.29]],[[30.47,-2.41],[30.53,-2.81],[30.74,-3.03],[30.75,-3.36],[30.5,-3.57],[30.12,-4.09],[29.75,-4.45],[29.34,-4.5],[29.28,-3.29],[29.03,-2.84],[29.63,-2.92],[29.94,-2.35],[30.47,-2.41]],[[35.72,32.71],[35.54,32.39],[35.18,32.53],[34.98,31.87],[35.22,31.75],[34.97,31.62],[34.93,31.35],[35.4,31.49],[35.42,31.1],[34.92,29.5],[34.82,29.76],[34.27,31.22],[34.55,31.55],[34.49,31.61],[34.75,32.07],[34.95,32.83],[35.1,33.08],[35.13,33.09],[35.46,33.09],[35.55,33.26],[35.82,33.28],[35.84,32.87],[35.7,32.72],[35.72,32.71]],[[35.82,33.28],[35.55,33.26],[35.46,33.09],[35.13,33.09],[35.48,33.91],[35.98,34.61],[36,34.65],[36.45,34.59],[36.61,34.2],[36.07,33.82],[35.82,33.28]],[[49.54,-12.47],[49.81,-12.9],[50.06,-13.56],[50.22,-14.76],[50.48,-15.23],[50.38,-15.71],[50.2,-16],[49.86,-15.41],[49.67,-15.71],[49.86,-16.45],[49.78,-16.87],[49.5,-17.11],[49.43,-17.95],[49.04,-19.12],[48.55,-20.5],[47.93,-22.39],[47.55,-23.78],[47.1,-24.94],[46.28,-25.18],[45.41,-25.6],[44.83,-25.35],[44.04,-24.99],[43.76,-24.46],[43.7,-23.57],[43.35,-22.78],[43.25,-22.06],[43.43,-21.34],[43.89,-21.16],[43.9,-20.83],[44.38,-20.07],[44.47,-19.44],[44.23,-18.96],[44.04,-18.33],[43.96,-17.41],[44.31,-16.85],[44.45,-16.22],[44.94,-16.18],[45.5,-15.97],[45.87,-15.79],[46.31,-15.78],[46.88,-15.21],[47.71,-14.59],[48,-14.09],[47.87,-13.66],[48.29,-13.78],[48.84,-13.09],[48.87,-12.49],[49.2,-12.04],[49.54,-12.47]],[[35.4,31.49],[34.93,31.35],[34.97,31.62],[35.22,31.75],[34.98,31.87],[35.18,32.53],[35.54,32.39],[35.54,31.78],[35.4,31.49]],[[-16.71,13.6],[-15.63,13.62],[-15.4,13.86],[-15.08,13.88],[-14.69,13.63],[-14.38,13.63],[-14.05,13.79],[-13.84,13.51],[-14.28,13.28],[-14.71,13.3],[-15.14,13.51],[-15.51,13.28],[-15.69,13.27],[-15.93,13.13],[-16.84,13.15],[-16.71,13.6]],[[9.48,30.31],[9.06,32.1],[8.44,32.51],[8.43,32.75],[7.61,33.34],[7.53,34.1],[8.14,34.66],[8.38,35.48],[8.22,36.43],[8.42,36.95],[9.51,37.35],[10.21,37.23],[10.18,36.72],[11.03,37.09],[11.1,36.9],[10.6,36.41],[10.59,35.95],[10.94,35.7],[10.81,34.83],[10.15,34.33],[10.34,33.79],[10.86,33.77],[11.11,33.29],[11.49,33.14],[11.43,32.37],[10.95,32.08],[10.64,31.76],[9.95,31.38],[10.06,30.96],[9.97,30.54],[9.48,30.31]],[[-8.69,27.4],[-8.67,27.66],[-7.06,29.58],[-5.24,30],[-3.69,30.9],[-3.07,31.72],[-1.31,32.26],[-1.39,32.86],[-1.79,34.53],[-1.21,35.72],[0.5,36.3],[3.16,36.78],[5.32,36.72],[7.33,37.12],[8.42,36.95],[8.38,35.48],[7.53,34.1],[8.43,32.75],[9.06,32.1],[9.8,29.42],[9.68,28.14],[9.63,27.14],[9.32,26.09],[9.95,24.94],[10.77,24.56],[12,23.47],[5.68,19.6],[3.16,19.06],[2.68,19.86],[1.82,20.61],[-4.92,24.97]],[[35.54,32.39],[35.72,32.71],[36.83,32.31],[38.79,33.38],[39.2,32.16],[39,32.01],[37,31.51],[38,30.51],[37.67,30.34],[37.5,30],[36.74,29.87],[36.5,29.51],[36.07,29.2],[34.95,29.36],[34.92,29.5],[35.42,31.1],[35.4,31.49],[35.54,31.78],[35.54,32.39]],[[51.58,24.24],[51.76,24.29],[51.8,24.02],[52.58,24.18],[53.4,24.15],[54.01,24.12],[54.69,24.8],[55.44,25.44],[56.07,26.06],[56.26,25.71],[56.4,24.93],[55.89,24.92],[55.8,24.27],[55.98,24.13],[55.53,23.93],[55.53,23.53],[55.23,23.11],[55.21,22.71],[55.01,22.5],[52,23],[51.62,24.01],[51.58,24.24]],[[50.81,24.75],[50.74,25.48],[51.01,26.01],[51.29,26.12],[51.59,25.8],[51.61,25.22],[51.39,24.63],[51.11,24.56],[50.81,24.75]],[[47.98,29.98],[48.18,29.53],[48.09,29.31],[48.42,28.55],[47.71,28.53],[47.46,29],[46.57,29.1],[47.3,30.06],[47.98,29.98]],[[39.2,32.16],[38.79,33.38],[41.01,34.42],[41.38,35.63],[41.29,36.36],[41.84,36.61],[42.35,37.23],[42.78,37.39],[43.94,37.26],[44.29,37],[44.77,37.17],[45.42,35.98],[46.08,35.68],[46.15,35.09],[45.65,34.75],[45.42,33.97],[46.11,33.02],[47.34,32.47],[47.85,31.71],[47.68,30.98],[48,30.98],[48.02,30.45],[48.57,29.93],[47.98,29.98],[47.3,30.06],[46.57,29.1],[44.71,29.18],[41.89,31.19],[40.4,31.89],[39.2,32.16]],[[55.21,22.71],[55.23,23.11],[55.53,23.53],[55.53,23.93],[55.98,24.13],[55.8,24.27],[55.89,24.92],[56.4,24.93],[56.85,24.24],[57.4,23.88],[58.14,23.75],[58.73,23.57],[59.18,22.99],[59.45,22.66],[59.81,22.53],[59.81,22.31],[59.44,21.71],[59.28,21.43],[58.86,21.11],[58.49,20.43],[58.03,20.48],[57.83,20.24],[57.67,19.74],[57.79,19.07],[57.7,18.95],[57.24,18.95],[56.61,18.57],[56.51,18.09],[56.28,17.88],[55.66,17.88],[55.27,17.63],[55.27,17.23],[54.79,16.95],[54.24,17.04],[53.57,16.71],[53.11,16.65],[52.78,17.35],[52,19],[55,20],[55.67,22],[55.21,22.71]],[[56.26,25.71],[56.07,26.06],[56.36,26.4],[56.49,26.31],[56.39,25.9],[56.26,25.71]],[[167.22,-15.89],[167.85,-16.47],[167.52,-16.6],[167.18,-16.16],[167.22,-15.89]],[[166.79,-15.67],[166.65,-15.39],[166.63,-14.63],[167.11,-14.93],[167.27,-15.74],[167,-15.61],[166.79,-15.67]],[[102.58,12.19],[102.35,13.39],[102.99,14.23],[104.28,14.42],[105.22,14.27],[106.04,13.88],[106.5,14.57],[107.38,14.2],[107.61,13.54],[107.49,12.34],[105.81,11.57],[106.25,10.96],[105.2,10.89],[104.33,10.49],[103.5,10.63],[103.09,11.15],[102.58,12.19]],[[105.22,14.27],[102.99,14.23],[102.58,12.19],[100.83,12.63],[100.1,13.41],[99.48,10.85],[99.22,9.24],[100.28,8.3],[101.02,6.86],[102.14,6.22],[101.16,5.69],[100.26,6.64],[99.69,6.85],[98.99,7.91],[98.34,7.79],[98.26,8.97],[99.04,10.96],[99.2,12.8],[99.1,13.83],[98.19,15.12],[98.9,16.18],[97.86,17.57],[97.8,18.63],[98.96,19.75],[100.12,20.42],[100.6,19.51],[101.04,18.41],[102.11,18.11],[103,17.96],[103.96,18.24],[104.78,16.44],[105.54,14.72]],[[107.38,14.2],[106.5,14.57],[106.04,13.88],[105.22,14.27],[105.54,14.72],[105.59,15.57],[104.78,16.44],[104.72,17.43],[103.96,18.24],[103.2,18.31],[103,17.96],[102.41,17.93],[102.11,18.11],[101.06,17.51],[101.04,18.41],[101.28,19.46],[100.6,19.51],[100.55,20.11],[100.12,20.42],[100.33,20.79],[101.18,21.44],[101.27,21.2],[101.8,21.17],[101.65,22.32],[102.17,22.46],[102.75,21.68],[103.2,20.77],[104.44,20.76],[104.82,19.89],[104.18,19.62],[103.9,19.27],[105.09,18.67],[105.93,17.48],[106.56,16.6],[107.31,15.91],[107.56,15.2],[107.38,14.2]],[[100.12,20.42],[98.96,19.75],[97.8,18.63],[97.86,17.57],[98.9,16.18],[98.19,15.12],[99.1,13.83],[99.2,12.8],[99.04,10.96],[98.46,10.68],[98.43,12.03],[98.1,13.64],[97.6,16.1],[96.5,16.43],[94.81,15.8],[94.54,17.28],[93.54,19.37],[93.08,19.86],[92.3,21.48],[92.67,22.04],[93.06,22.7],[93.33,24.08],[94.55,24.67],[95.15,26],[96.42,27.26],[97.05,27.7],[97.33,28.26],[98.25,27.75],[98.71,26.74],[97.72,25.08],[98.66,24.06],[99.53,22.95],[99.98,21.74],[101.15,21.85],[100.33,20.79]],[[104.33,10.49],[105.2,10.89],[106.25,10.96],[105.81,11.57],[107.49,12.34],[107.61,13.54],[107.38,14.2],[107.56,15.2],[107.31,15.91],[106.56,16.6],[105.93,17.48],[105.09,18.67],[103.9,19.27],[104.18,19.62],[104.82,19.89],[104.44,20.76],[103.2,20.77],[102.75,21.68],[102.17,22.46],[102.71,22.71],[103.5,22.7],[104.48,22.82],[105.33,23.35],[105.81,22.98],[106.72,22.79],[106.57,22.22],[107.04,21.81],[108.05,21.55],[106.71,20.7],[105.88,19.75],[105.66,19.06],[106.43,18],[107.36,16.7],[108.27,16.08],[108.88,15.28],[109.33,13.43],[109.2,11.67],[108.37,11.01],[107.22,10.36],[106.4,9.53],[105.16,8.6],[104.8,9.24],[105.08,9.92],[104.33,10.49]],[[130.78,42.22],[130.78,42.22],[130.78,42.22],[130.78,42.22]],[[130.64,42.4],[130.78,42.22],[130.4,42.28],[129.97,41.94],[129.67,41.6],[129.7,40.88],[129.19,40.66],[129.01,40.48],[128.63,40.19],[127.97,40.03],[127.53,39.76],[127.5,39.32],[127.39,39.21],[127.79,39.05],[128.35,38.61],[128.21,38.37],[127.78,38.3],[127.07,38.26],[126.68,37.81],[126.24,37.84],[126.18,37.75],[125.69,37.94],[125.57,37.75],[125.28,37.67],[125.24,37.86],[124.98,37.95],[124.71,38.11],[124.98,38.55],[125.22,38.67],[125.13,38.85],[125.39,39.39],[125.32,39.55],[124.74,39.66],[124.26,39.93],[125.08,40.57],[126.18,41.11],[126.87,41.82],[127.34,41.5],[128.21,41.47],[128.05,41.99],[129.6,42.42],[130,42.98],[130.64,42.4]],[[126.18,37.75],[126.24,37.84],[126.68,37.81],[127.07,38.26],[127.78,38.3],[128.21,38.37],[128.35,38.61],[129.21,37.43],[129.46,36.78],[129.47,35.63],[129.09,35.08],[128.18,34.89],[127.39,34.48],[126.49,34.39],[126.37,34.93],[126.56,35.68],[126.12,36.73],[126.86,36.89],[126.18,37.75]],[[87.75,49.3],[90.71,50.33],[93.11,50.49],[94.82,50.01],[97.26,49.73],[97.83,51.01],[99.98,51.63],[102.07,51.26],[103.68,50.09],[105.89,50.41],[107.87,49.79],[109.4,49.29],[111.58,49.38],[114.36,50.25],[115.49,49.81],[116.19,49.13],[115.74,47.73],[117.29,47.7],[118.87,47.75],[119.66,46.69],[117.42,46.67],[115.98,45.73],[113.46,44.81],[111.87,45.1],[111.67,44.07],[111.13,43.41],[109.24,42.52],[106.13,42.14],[104.52,41.91],[101.83,42.51],[99.52,42.52],[96.35,42.73],[95.31,44.24],[93.48,44.98],[90.95,45.29],[90.97,46.89],[88.85,48.07],[87.75,49.3]],[[97.33,28.26],[97.13,27.08],[95.15,26],[94.11,23.85],[93.06,22.7],[92.14,23.63],[91.16,23.5],[92.38,24.98],[89.92,25.27],[88.56,26.45],[88.31,24.87],[88.53,23.63],[88.89,21.69],[87.03,20.74],[83.94,18.3],[82.19,16.56],[80.33,15.9],[80.29,13.01],[79.34,10.31],[78.28,8.93],[76.59,8.9],[75.4,11.78],[74.44,14.62],[72.82,19.21],[71.17,20.76],[69.64,22.45],[68.84,24.36],[70.28,25.72],[70.62,27.99],[73.45,29.98],[75.26,32.27],[73.75,34.32],[76.87,34.65],[78.81,33.51],[78.46,32.62],[81.11,30.18],[81.06,28.42],[84.67,27.24],[87.23,26.4],[88.04,27.45],[88.81,27.3],[90.37,26.88],[92.11,27.45],[93.41,28.64],[96.12,29.45],[97.33,28.26]],[[92.67,22.04],[92.65,21.32],[92.3,21.48],[92.37,20.67],[92.08,21.19],[92.03,21.7],[91.84,22.18],[91.42,22.77],[90.5,22.8],[90.59,22.39],[90.27,21.84],[89.85,22.04],[89.7,21.86],[89.42,21.97],[89.03,22.06],[88.88,22.88],[88.53,23.63],[88.7,24.23],[88.08,24.5],[88.31,24.87],[88.93,25.24],[88.21,25.77],[88.56,26.45],[89.35,26.02],[89.83,25.96],[89.92,25.27],[90.87,25.13],[91.8,25.15],[92.38,24.98],[91.91,24.13],[91.47,24.07],[91.16,23.5],[91.71,22.99],[91.87,23.62],[92.14,23.63],[92.67,22.04]],[[91.7,27.77],[92.11,27.45],[92.03,26.84],[91.22,26.81],[90.37,26.88],[89.74,26.72],[88.84,27.1],[88.81,27.3],[89.48,28.04],[90.02,28.3],[90.73,28.06],[91.26,28.04],[91.7,27.77]],[[88.12,27.88],[88.04,27.45],[88.17,26.81],[88.06,26.41],[87.23,26.4],[86.02,26.63],[85.25,26.73],[84.67,27.24],[83.3,27.36],[82,27.93],[81.06,28.42],[80.09,28.79],[80.48,29.73],[81.11,30.18],[81.52,30.42],[82.33,30.11],[83.34,29.46],[83.9,29.32],[84.24,28.84],[85.01,28.64],[85.82,28.2],[86.95,27.97],[88.12,27.88]],[[77.84,35.49],[75.76,34.51],[73.75,34.32],[74.45,32.77],[74.41,31.69],[73.45,29.98],[71.78,27.91],[69.51,26.94],[70.28,25.72],[71.04,24.36],[68.18,23.69],[67.15,24.66],[64.53,25.24],[61.5,25.08],[63.32,26.76],[62.75,27.38],[61.77,28.7],[60.87,29.83],[63.55,29.47],[64.35,29.56],[66.35,29.89],[66.94,31.3],[67.79,31.58],[68.93,31.62],[69.26,32.5],[70.32,33.36],[70.88,33.99],[71.11,34.73],[71.5,35.65],[71.85,36.51],[74.07,36.84],[75.16,37.13],[76.19,35.9]],[[66.52,37.36],[67.83,37.15],[68.86,37.34],[69.52,37.61],[70.27,37.73],[70.81,38.49],[71.24,37.95],[71.45,37.07],[72.19,36.95],[73.26,37.5],[74.98,37.42],[74.58,37.02],[72.92,36.72],[71.26,36.07],[71.61,35.15],[71.16,34.35],[69.93,34.02],[69.69,33.11],[69.32,31.9],[68.56,31.71],[67.68,31.3],[66.38,30.74],[65.05,29.47],[64.15,29.34],[62.55,29.32],[61.78,30.74],[60.94,31.55],[60.54,32.98],[60.53,33.68],[61.21,35.65],[62.98,35.4],[63.98,36.01],[64.74,37.11],[65.75,37.66],[66.52,37.36]],[[67.83,37.15],[68.39,38.16],[68.18,38.9],[67.44,39.14],[67.7,39.58],[68.54,39.53],[69.01,40.09],[69.33,40.73],[70.67,40.96],[70.46,40.5],[70.6,40.22],[71.01,40.24],[70.65,39.94],[69.56,40.1],[69.46,39.53],[70.55,39.6],[71.78,39.28],[73.68,39.43],[73.93,38.51],[74.26,38.61],[74.86,38.38],[74.83,37.99],[74.98,37.42],[73.95,37.42],[73.26,37.5],[72.64,37.05],[72.19,36.95],[71.84,36.74],[71.45,37.07],[71.54,37.91],[71.24,37.95],[71.35,38.26],[70.81,38.49],[70.38,38.14],[70.27,37.73],[70.12,37.59],[69.52,37.61],[69.19,37.15],[68.86,37.34],[68.14,37.02],[67.83,37.15]],[[70.96,42.27],[71.19,42.7],[71.84,42.85],[73.49,42.5],[73.64,43.09],[74.21,43.3],[75.64,42.88],[76,42.99],[77.66,42.96],[79.14,42.86],[79.65,42.5],[80.26,42.35],[80.12,42.12],[78.54,41.58],[78.19,41.19],[76.91,41.07],[76.53,40.43],[75.47,40.56],[74.78,40.37],[73.82,39.89],[73.96,39.66],[73.68,39.43],[71.78,39.28],[70.55,39.6],[69.46,39.53],[69.56,40.1],[70.65,39.94],[71.01,40.24],[71.78,40.15],[73.05,40.87],[71.87,41.39],[71.16,41.14],[70.42,41.52],[71.26,42.17],[70.96,42.27]],[[52.5,41.78],[52.94,42.12],[54.08,42.32],[54.75,42.04],[55.46,41.26],[55.97,41.31],[57.09,41.32],[56.93,41.83],[57.79,42.17],[58.63,42.75],[59.97,42.22],[60.08,41.43],[60.46,41.22],[61.55,41.27],[61.88,41.08],[62.38,40.05],[63.52,39.36],[64.17,38.89],[65.22,38.4],[66.54,37.97],[66.52,37.36],[66.22,37.39],[65.75,37.66],[65.59,37.3],[64.74,37.11],[64.55,36.31],[63.98,36.01],[63.19,35.86],[62.98,35.4],[62.23,35.27],[61.21,35.65],[61.12,36.49],[60.38,36.53],[59.23,37.41],[58.44,37.52],[57.33,38.03],[56.62,38.12],[56.18,37.94],[55.51,37.96],[54.8,37.39],[53.92,37.2],[53.74,37.91],[53.88,38.95],[53.1,39.29],[53.36,39.98],[52.7,40.03],[52.92,40.88],[53.86,40.63],[54.74,40.95],[54.01,41.55],[53.72,42.12],[52.92,41.87],[52.81,41.13],[52.5,41.78]],[[48.57,29.93],[48,30.98],[47.85,31.71],[46.11,33.02],[45.65,34.75],[46.08,35.68],[44.77,37.17],[44.42,38.28],[44.79,39.71],[45.46,38.87],[46.51,38.77],[48.06,39.58],[48.01,38.79],[48.88,38.32],[50.15,37.37],[52.26,36.7],[53.92,37.2],[55.51,37.96],[56.62,38.12],[58.44,37.52],[60.38,36.53],[61.21,35.65],[60.53,33.68],[60.54,32.98],[60.94,31.55],[61.78,30.74],[61.37,29.3],[62.73,28.26],[63.23,27.22],[61.88,26.24],[59.61,25.38],[57.4,25.74],[56.49,27.14],[54.72,26.48],[52.48,27.58],[50.85,28.81],[49.58,29.99],[48.57,29.93]],[[35.72,32.71],[35.7,32.72],[35.84,32.87],[35.82,33.28],[36.07,33.82],[36.61,34.2],[36.45,34.59],[36,34.65],[35.9,35.41],[36.15,35.82],[36.42,36.04],[36.69,36.26],[36.74,36.82],[37.07,36.62],[38.17,36.9],[38.7,36.71],[39.52,36.72],[40.68,37.09],[41.21,37.07],[42.35,37.23],[41.84,36.61],[41.29,36.36],[41.38,35.63],[41.01,34.42],[38.79,33.38],[36.83,32.31],[35.72,32.71]],[[46.51,38.77],[46.14,38.74],[45.74,39.32],[45.74,39.47],[45.3,39.47],[45,39.74],[44.79,39.71],[44.4,40],[43.66,40.25],[43.75,40.74],[43.58,41.09],[44.97,41.25],[45.18,40.99],[45.56,40.81],[45.36,40.56],[45.89,40.22],[45.61,39.9],[46.04,39.63],[46.48,39.46],[46.51,38.77]],[[11.03,58.86],[11.47,59.43],[12.3,60.12],[12.63,61.29],[11.99,61.8],[11.93,63.13],[12.58,64.07],[13.57,64.05],[13.92,64.44],[13.56,64.79],[15.11,66.19],[16.11,67.3],[16.77,68.01],[17.73,68.01],[17.99,68.57],[19.88,68.41],[20.03,69.07],[20.64,69.11],[21.98,68.62],[23.54,67.94],[23.57,66.4],[23.9,66.01],[22.18,65.72],[21.21,65.03],[21.37,64.41],[19.78,63.61],[17.85,62.75],[17.12,61.34],[17.83,60.64],[18.79,60.08],[17.87,58.95],[16.83,58.72],[16.45,57.04],[15.88,56.1],[14.67,56.2],[14.1,55.41],[12.94,55.36],[12.62,56.31],[11.79,57.44],[11.03,58.86]],[[28.18,56.17],[29.23,55.92],[29.37,55.67],[29.9,55.79],[30.88,55.55],[30.97,55.08],[30.76,54.81],[31.38,54.16],[31.79,53.97],[31.73,53.79],[32.41,53.62],[32.69,53.35],[32.3,53.13],[31.5,53.17],[31.3,53.07],[31.54,52.74],[31.79,52.1],[30.93,52.04],[30.62,51.82],[30.56,51.32],[30.16,51.42],[29.26,51.37],[28.99,51.6],[28.62,51.43],[28.24,51.57],[27.46,51.59],[26.34,51.83],[25.33,51.91],[24.55,51.89],[24.01,51.62],[23.53,51.58],[23.51,52.02],[23.2,52.49],[23.8,52.69],[23.81,53.09],[23.53,53.47],[23.48,53.91],[24.45,53.91],[25.54,54.28],[25.77,54.85],[26.59,55.17],[26.49,55.61],[27.1,55.78],[28.18,56.17]],[[31.79,52.1],[32.41,52.29],[33.75,52.33],[34.14,51.57],[35.02,51.21],[35.36,50.58],[37.39,50.38],[38.59,49.93],[40.08,49.31],[39.9,48.23],[38.77,47.83],[38.22,47.1],[36.76,46.7],[34.96,46.27],[34.86,45.77],[34.41,46],[33.44,45.97],[31.74,46.33],[30.75,46.58],[29.6,45.29],[28.68,45.3],[28.49,45.6],[28.94,46.26],[29.07,46.52],[29.76,46.35],[29.84,46.53],[29.56,46.93],[29.05,47.51],[28.67,48.12],[27.52,48.47],[26.62,48.22],[25.95,47.99],[24.87,47.74],[23.76,47.99],[22.71,47.88],[22.08,48.42],[22.56,49.09],[22.52,49.48],[23.92,50.43],[23.53,51.58],[24.55,51.89],[26.34,51.83],[28.24,51.57],[28.99,51.6],[30.16,51.42],[30.62,51.82],[31.79,52.1]],[[23.48,53.91],[23.53,53.47],[23.81,53.09],[23.8,52.69],[23.2,52.49],[23.51,52.02],[23.53,51.58],[24.03,50.71],[23.92,50.43],[23.43,50.31],[22.52,49.48],[22.78,49.03],[22.56,49.09],[21.61,49.47],[20.89,49.33],[20.42,49.43],[19.82,49.22],[19.32,49.57],[18.91,49.44],[18.85,49.5],[18.39,49.99],[17.65,50.05],[17.56,50.36],[16.87,50.47],[16.72,50.22],[16.18,50.42],[16.24,50.7],[15.49,50.78],[15.02,51.11],[14.61,51.75],[14.69,52.09],[14.44,52.63],[14.07,52.98],[14.35,53.25],[14.12,53.76],[14.8,54.05],[16.36,54.51],[17.62,54.85],[18.62,54.68],[18.7,54.44],[19.66,54.43],[20.89,54.31],[22.73,54.33],[23.24,54.22],[23.48,53.91]],[[16.98,48.12],[16.9,47.72],[16.34,47.71],[16.53,47.5],[16.2,46.85],[16.01,46.68],[15.14,46.66],[14.63,46.43],[13.81,46.51],[12.38,46.77],[12.15,47.11],[11.17,46.94],[11.05,46.75],[10.44,46.89],[9.93,46.92],[9.48,47.1],[9.63,47.35],[9.6,47.52],[9.89,47.58],[10.4,47.3],[10.54,47.57],[11.42,47.52],[12.14,47.7],[12.62,47.67],[12.93,47.47],[13.03,47.64],[12.88,48.29],[13.24,48.42],[13.6,48.88],[14.34,48.56],[14.9,48.96],[15.26,49.04],[16.03,48.73],[16.5,48.79],[16.96,48.6],[16.88,48.47],[16.98,48.12]],[[22.08,48.42],[22.64,48.15],[22.71,47.88],[22.1,47.67],[21.63,46.99],[21.02,46.32],[20.22,46.13],[19.6,46.17],[18.83,45.91],[18.46,45.76],[17.63,45.95],[16.88,46.38],[16.57,46.5],[16.37,46.84],[16.2,46.85],[16.53,47.5],[16.34,47.71],[16.9,47.72],[16.98,48.12],[17.49,47.87],[17.86,47.76],[18.7,47.88],[18.78,48.08],[19.18,48.11],[19.66,48.27],[19.77,48.2],[20.24,48.33],[20.48,48.56],[20.8,48.62],[21.87,48.32],[22.08,48.42]],[[26.62,48.22],[26.86,48.37],[27.52,48.47],[28.26,48.16],[28.67,48.12],[29.12,47.85],[29.05,47.51],[29.41,47.35],[29.56,46.93],[29.91,46.67],[29.84,46.53],[30.03,46.42],[29.76,46.35],[29.17,46.38],[29.07,46.52],[28.86,46.44],[28.94,46.26],[28.66,45.94],[28.49,45.6],[28.23,45.49],[28.05,45.95],[28.16,46.37],[28.13,46.81],[27.55,47.41],[27.23,47.83],[26.92,48.12],[26.62,48.22]],[[28.23,45.49],[28.68,45.3],[29.15,45.46],[29.6,45.29],[29.63,45.04],[29.14,44.82],[28.84,44.91],[28.56,43.71],[27.97,43.81],[27.24,44.18],[26.07,43.94],[25.57,43.69],[24.1,43.74],[23.33,43.9],[22.94,43.82],[22.66,44.24],[22.47,44.41],[22.71,44.58],[22.46,44.7],[22.15,44.48],[21.56,44.77],[21.48,45.18],[20.87,45.42],[20.76,45.74],[20.22,46.13],[21.02,46.32],[21.63,46.99],[22.1,47.67],[22.71,47.88],[23.14,48.1],[23.76,47.99],[24.4,47.98],[24.87,47.74],[25.21,47.89],[25.95,47.99],[26.2,48.22],[26.62,48.22],[26.92,48.12],[27.23,47.83],[27.55,47.41],[28.13,46.81],[28.16,46.37],[28.05,45.95],[28.23,45.49]],[[26.49,55.61],[26.59,55.17],[25.77,54.85],[25.54,54.28],[24.45,53.91],[23.48,53.91],[23.24,54.22],[22.73,54.33],[22.65,54.58],[22.76,54.86],[22.31,55.02],[21.27,55.19],[21.05,56.03],[22.2,56.34],[23.88,56.27],[24.86,56.37],[25,56.16],[25.53,56.1],[26.49,55.61]],[[27.29,57.47],[27.77,57.24],[27.86,56.76],[28.18,56.17],[27.1,55.78],[26.49,55.61],[25.53,56.1],[25,56.16],[24.86,56.37],[23.88,56.27],[22.2,56.34],[21.05,56.03],[21.09,56.78],[21.58,57.41],[22.52,57.75],[23.32,57.01],[24.12,57.03],[24.31,57.79],[25.17,57.97],[25.6,57.85],[26.46,57.48],[27.29,57.47]],[[27.98,59.48],[28.13,59.3],[27.42,58.72],[27.72,57.79],[27.29,57.47],[26.46,57.48],[25.6,57.85],[25.17,57.97],[24.31,57.79],[24.43,58.38],[24.06,58.26],[23.43,58.61],[23.34,59.19],[24.6,59.47],[25.86,59.61],[26.95,59.45],[27.98,59.48]],[[14.12,53.76],[14.35,53.25],[14.07,52.98],[14.44,52.63],[14.69,52.09],[14.61,51.75],[15.02,51.11],[14.57,51],[14.31,51.12],[14.06,50.93],[13.34,50.73],[12.97,50.48],[12.24,50.27],[12.41,49.97],[12.52,49.55],[13.03,49.31],[13.6,48.88],[13.24,48.42],[12.88,48.29],[13.03,47.64],[12.93,47.47],[12.62,47.67],[12.14,47.7],[11.42,47.52],[10.54,47.57],[10.4,47.3],[9.89,47.58],[9.6,47.52],[8.52,47.83],[8.32,47.61],[7.47,47.62],[7.59,48.33],[8.1,49.02],[6.66,49.2],[6.19,49.46],[6.24,49.9],[6.04,50.13],[6.16,50.8],[5.99,51.85],[6.59,51.85],[6.84,52.23],[7.09,53.14],[6.91,53.48],[7.1,53.69],[7.94,53.75],[8.12,53.53],[8.8,54.02],[8.57,54.4],[8.53,54.96],[9.28,54.83],[9.92,54.98],[9.94,54.6],[10.95,54.36],[10.94,54.01],[11.96,54.2],[12.52,54.47],[13.65,54.08],[14.12,53.76]],[[22.66,44.24],[22.94,43.82],[23.33,43.9],[24.1,43.74],[25.57,43.69],[26.07,43.94],[27.24,44.18],[27.97,43.81],[28.56,43.71],[28.04,43.29],[27.68,42.58],[28,42.01],[27.14,42.14],[26.12,41.83],[26.11,41.33],[25.2,41.23],[24.49,41.58],[23.69,41.31],[22.95,41.34],[22.88,42],[22.38,42.32],[22.55,42.46],[22.44,42.58],[22.61,42.9],[22.98,43.21],[22.5,43.64],[22.41,44.01],[22.66,44.24]],[[26.29,35.3],[26.16,35],[24.72,34.92],[24.73,35.09],[23.51,35.28],[23.7,35.71],[24.25,35.37],[25.03,35.43],[25.77,35.35],[25.75,35.18],[26.29,35.3]],[[22.95,41.34],[23.69,41.31],[24.49,41.58],[25.2,41.23],[26.11,41.33],[26.12,41.83],[26.6,41.56],[26.29,40.94],[26.06,40.82],[25.45,40.85],[24.92,40.95],[23.72,40.69],[24.41,40.12],[23.9,39.96],[23.34,39.96],[22.82,40.48],[22.63,40.26],[22.85,39.66],[23.35,39.19],[22.97,38.97],[23.53,38.51],[24.02,38.22],[24.04,37.65],[23.11,37.92],[23.41,37.41],[22.78,37.3],[23.15,36.42],[22.49,36.41],[21.67,36.84],[21.3,37.64],[21.12,38.31],[20.73,38.77],[20.22,39.34],[20.15,39.63],[20.62,40.11],[20.67,40.44],[21,40.58],[21.02,40.84],[21.67,40.93],[22.06,41.15],[22.6,41.13],[22.76,41.3],[22.95,41.34]],[[44.77,37.17],[44.29,37],[43.94,37.26],[42.78,37.39],[42.35,37.23],[41.21,37.07],[40.68,37.09],[39.52,36.72],[38.7,36.71],[38.17,36.9],[37.07,36.62],[36.74,36.82],[36.69,36.26],[36.42,36.04],[36.15,35.82],[35.78,36.28],[36.16,36.65],[35.55,36.56],[34.71,36.8],[34.03,36.22],[32.51,36.11],[31.7,36.64],[30.62,36.68],[30.39,36.26],[29.7,36.15],[28.73,36.68],[27.64,36.66],[27.05,37.65],[26.32,38.21],[26.8,38.99],[26.17,39.46],[27.28,40.42],[28.82,40.46],[29.24,41.22],[31.15,41.09],[32.35,41.74],[33.51,42.02],[35.17,42.04],[36.91,41.33],[38.35,40.95],[39.51,41.1],[40.37,41.01],[41.55,41.54],[42.62,41.58],[43.58,41.09],[43.75,40.74],[43.66,40.25],[44.4,40],[44.79,39.71],[44.11,39.43],[44.42,38.28],[44.22,37.97],[44.77,37.17]],[[26.12,41.83],[27.14,42.14],[28,42.01],[28.11,41.62],[28.99,41.3],[28.81,41.06],[27.62,41],[27.19,40.69],[26.36,40.15],[26.04,40.62],[26.06,40.82],[26.29,40.94],[26.6,41.56],[26.12,41.83]],[[21.02,40.84],[21,40.58],[20.67,40.44],[20.62,40.11],[20.15,39.63],[19.98,39.69],[19.96,39.91],[19.41,40.25],[19.32,40.73],[19.4,41.41],[19.54,41.72],[19.37,41.88],[19.31,42.2],[19.74,42.69],[19.8,42.5],[20.07,42.59],[20.28,42.32],[20.52,42.22],[20.59,41.86],[20.46,41.52],[20.6,41.09],[21.02,40.84]],[[16.57,46.5],[16.88,46.38],[17.63,45.95],[18.46,45.76],[18.83,45.91],[19.07,45.52],[19.39,45.24],[19.01,44.86],[18.55,45.08],[17.86,45.07],[17,45.23],[16.53,45.21],[16.32,45],[15.96,45.23],[15.75,44.82],[16.24,44.35],[16.46,44.04],[16.91,43.67],[17.3,43.45],[17.67,43.03],[18.56,42.65],[18.45,42.48],[17.51,42.85],[16.93,43.21],[16.01,43.51],[15.18,44.24],[15.38,44.32],[14.92,44.74],[14.9,45.08],[14.26,45.23],[13.95,44.8],[13.66,45.14],[13.68,45.48],[13.71,45.5],[14.41,45.47],[14.6,45.64],[14.93,45.47],[15.33,45.45],[15.32,45.73],[15.67,45.83],[15.77,46.24],[16.57,46.5]],[[9.6,47.52],[9.63,47.35],[9.48,47.1],[9.93,46.92],[10.44,46.89],[10.36,46.48],[9.92,46.31],[9.18,46.44],[8.97,46.04],[8.49,46],[8.32,46.16],[7.76,45.82],[7.27,45.78],[6.84,45.99],[6.5,46.43],[6.02,46.27],[6.04,46.73],[6.77,47.29],[6.74,47.54],[7.19,47.45],[7.47,47.62],[8.32,47.61],[8.52,47.83],[9.6,47.52]],[[6.04,50.13],[6.24,49.9],[6.19,49.46],[5.9,49.44],[5.68,49.53],[5.78,50.09],[6.04,50.13]],[[6.16,50.8],[6.04,50.13],[5.78,50.09],[5.68,49.53],[4.8,49.99],[4.29,49.91],[3.59,50.38],[3.12,50.78],[2.66,50.8],[2.51,51.15],[3.31,51.35],[4.05,51.27],[4.97,51.47],[5.61,51.04],[6.16,50.8]],[[6.91,53.48],[7.09,53.14],[6.84,52.23],[6.59,51.85],[5.99,51.85],[6.16,50.8],[5.61,51.04],[4.97,51.47],[4.05,51.27],[3.31,51.35],[3.83,51.62],[4.71,53.09],[6.08,53.51],[6.91,53.48]],[[-9.03,41.88],[-8.67,42.14],[-8.26,42.28],[-8.01,41.79],[-7.42,41.79],[-7.25,41.92],[-6.67,41.88],[-6.39,41.38],[-6.85,41.11],[-6.86,40.33],[-7.03,40.19],[-7.07,39.71],[-7.5,39.63],[-7.1,39.03],[-7.37,38.37],[-7.03,38.08],[-7.17,37.8],[-7.54,37.43],[-7.45,37.1],[-7.86,36.84],[-8.38,36.98],[-8.9,36.87],[-8.75,37.65],[-8.84,38.27],[-9.29,38.36],[-9.53,38.74],[-9.45,39.39],[-9.05,39.76],[-8.98,40.16],[-8.77,40.76],[-8.79,41.18],[-8.99,41.54],[-9.03,41.88]],[[-7.45,37.1],[-7.54,37.43],[-7.17,37.8],[-7.03,38.08],[-7.37,38.37],[-7.1,39.03],[-7.5,39.63],[-7.07,39.71],[-7.03,40.19],[-6.86,40.33],[-6.85,41.11],[-6.39,41.38],[-6.67,41.88],[-7.25,41.92],[-7.42,41.79],[-8.01,41.79],[-8.26,42.28],[-8.67,42.14],[-9.03,41.88],[-8.98,42.59],[-9.39,43.03],[-7.98,43.75],[-6.76,43.57],[-5.41,43.57],[-4.35,43.4],[-3.52,43.46],[-1.9,43.42],[-1.5,43.03],[0.34,42.58],[0.7,42.8],[1.83,42.34],[2.99,42.47],[3.04,41.89],[2.09,41.23],[0.81,41.01],[0.72,40.68],[0.11,40.12],[-0.28,39.31],[0.11,38.74],[-0.47,38.29],[-0.68,37.64],[-1.44,37.44],[-2.15,36.67],[-3.41,36.66],[-4.37,36.68],[-5,36.32],[-5.38,35.95],[-5.87,36.03],[-6.24,36.37],[-6.52,36.94],[-7.45,37.1]],[[-6.2,53.87],[-6.03,53.15],[-6.79,52.26],[-8.56,51.67],[-9.98,51.82],[-9.17,52.86],[-9.69,53.88],[-8.33,54.67],[-7.57,55.13],[-7.37,54.6],[-7.57,54.06],[-6.95,54.07],[-6.2,53.87]],[[165.78,-21.08],[166.6,-21.7],[167.12,-22.16],[166.74,-22.4],[166.19,-22.13],[165.47,-21.68],[164.83,-21.15],[164.17,-20.45],[164.03,-20.11],[164.46,-20.12],[165.02,-20.46],[165.46,-20.8],[165.78,-21.08]],[[162.12,-10.48],[162.4,-10.83],[161.7,-10.82],[161.32,-10.21],[161.92,-10.45],[162.12,-10.48]],[[161.68,-9.6],[161.53,-9.78],[160.79,-8.92],[160.58,-8.32],[160.92,-8.32],[161.28,-9.12],[161.68,-9.6]],[[160.85,-9.87],[160.46,-9.9],[159.85,-9.79],[159.64,-9.64],[159.7,-9.24],[160.36,-9.4],[160.69,-9.61],[160.85,-9.87]],[[159.64,-8.02],[159.88,-8.34],[159.92,-8.54],[159.13,-8.11],[158.59,-7.75],[158.21,-7.42],[158.36,-7.32],[158.82,-7.56],[159.64,-8.02]],[[157.14,-7.02],[157.54,-7.35],[157.34,-7.4],[156.9,-7.18],[156.49,-6.77],[156.54,-6.6],[157.14,-7.02]],[[176.89,-40.07],[176.51,-40.61],[176.01,-41.29],[175.24,-41.69],[175.07,-41.43],[174.65,-41.28],[175.23,-40.46],[174.9,-39.91],[173.82,-39.51],[173.85,-39.15],[174.57,-38.8],[174.74,-38.03],[174.7,-37.38],[174.29,-36.71],[174.32,-36.53],[173.84,-36.12],[173.06,-35.24],[172.63,-34.53],[173.01,-34.45],[173.55,-35.01],[174.33,-35.27],[174.61,-36.16],[175.34,-37.21],[175.36,-36.53],[175.81,-36.8],[175.96,-37.56],[176.76,-37.88],[177.44,-37.96],[178.01,-37.58],[178.52,-37.7],[178.28,-38.58],[177.97,-39.17],[177.21,-39.15],[176.94,-39.45],[177.03,-39.88],[176.89,-40.07]],[[169.67,-43.56],[170.52,-43.03],[171.13,-42.51],[171.57,-41.77],[171.95,-41.51],[172.1,-40.96],[172.8,-40.49],[173.02,-40.92],[173.25,-41.33],[173.96,-40.93],[174.25,-41.35],[174.25,-41.77],[173.88,-42.23],[173.22,-42.97],[172.71,-43.37],[173.08,-43.85],[172.31,-43.87],[171.45,-44.24],[171.18,-44.9],[170.62,-45.91],[169.83,-46.36],[169.33,-46.64],[168.41,-46.62],[167.76,-46.29],[166.68,-46.22],[166.51,-45.85],[167.05,-45.11],[168.3,-44.12],[168.95,-43.94],[169.67,-43.56]],[[147.69,-40.81],[148.29,-40.87],[148.36,-42.06],[148.02,-42.41],[147.91,-43.21],[147.56,-42.94],[146.87,-43.64],[146.66,-43.58],[146.05,-43.55],[145.43,-42.69],[145.3,-42.03],[144.72,-41.16],[144.74,-40.7],[145.4,-40.79],[146.36,-41.14],[146.91,-41],[147.69,-40.81]],[[126.15,-32.22],[123.66,-33.89],[120.58,-33.93],[118.5,-34.75],[115.56,-34.39],[115.71,-33.26],[115.16,-30.6],[114.62,-28.52],[113.34,-26.12],[114.23,-26.3],[113.39,-24.38],[113.74,-22.47],[115.46,-21.49],[117.44,-20.75],[119.25,-19.95],[121.65,-18.71],[123.01,-16.41],[123.82,-16.11],[125.17,-14.68],[126.14,-14.1],[128.36,-14.87],[129.89,-13.62],[131.22,-12.18],[131.82,-11.27],[134.39,-12.04],[136.26,-12.05],[136.31,-13.29],[135.43,-14.72],[137.58,-16.22],[139.26,-17.37],[141.27,-16.39],[141.63,-14.27],[141.69,-12.41],[142.52,-10.67],[143.16,-12.33],[143.92,-14.55],[145.27,-15.43],[146.16,-17.76],[148.18,-19.96],[149.68,-22.34],[150.9,-23.46],[153.14,-26.07],[153.51,-28.99],[152.89,-31.64],[151.01,-34.31],[149.95,-37.11],[147.38,-38.22],[144.88,-38.42],[142.75,-38.54],[139.99,-37.4],[138.12,-35.61],[136.83,-35.26],[137.81,-32.9],[135.21,-34.48],[134.27,-32.62],[129.53,-31.59]],[[81.79,7.52],[81.64,6.48],[81.22,6.2],[80.35,5.97],[79.87,6.76],[79.7,8.2],[80.15,9.82],[80.84,9.27],[81.31,8.56],[81.79,7.52]],[[109.48,18.2],[108.65,18.51],[108.63,19.37],[109.12,19.82],[110.21,20.1],[110.79,20.08],[111.01,19.7],[110.57,19.26],[110.34,18.68],[109.48,18.2]],[[80.26,42.35],[81.95,45.32],[85.72,47.45],[87.75,49.3],[90.97,46.89],[93.48,44.98],[96.35,42.73],[101.83,42.51],[106.13,42.14],[111.13,43.41],[111.87,45.1],[115.98,45.73],[119.66,46.69],[117.29,47.7],[116.19,49.13],[119.28,50.58],[120.18,52.75],[125.07,53.16],[127.29,50.74],[130.99,47.79],[134.5,47.58],[131.88,45.32],[130.63,42.9],[128.05,41.99],[126.18,41.11],[122.13,39.17],[122.17,40.42],[119.02,39.25],[118.88,37.9],[121.71,37.48],[120.64,36.11],[120.62,33.38],[121.27,30.68],[121.68,28.23],[118.66,24.55],[114.15,22.22],[110.79,21.4],[109.86,21.39],[106.57,22.22],[104.48,22.82],[101.65,22.32],[101.15,21.85],[99.53,22.95],[97.72,25.08],[98.25,27.75],[96.59,28.83],[93.41,28.64],[90.73,28.06],[88.73,28.09],[85.01,28.64],[82.33,30.11],[78.74,31.52],[78.81,33.51],[75.9,36.67],[74.86,38.38],[73.96,39.66],[76.53,40.43],[80.12,42.12]],[[121.78,24.39],[121.18,22.79],[120.75,21.97],[120.22,22.81],[120.11,23.56],[120.69,24.54],[121.5,25.3],[121.95,25],[121.78,24.39]],[[10.44,46.89],[11.17,46.94],[12.38,46.77],[13.7,46.02],[13.14,45.74],[12.38,44.89],[12.59,44.09],[14.03,42.76],[15.92,41.96],[15.89,41.54],[17.52,40.88],[18.48,40.17],[17.74,40.28],[16.45,39.8],[17.05,38.9],[16.1,37.99],[15.69,38.22],[16.11,38.96],[15.41,40.05],[14.7,40.61],[13.63,41.19],[12.11,41.71],[10.51,42.93],[9.7,44.04],[8.43,44.23],[7.44,43.69],[7.01,44.25],[7.1,45.33],[6.84,45.99],[7.76,45.82],[8.49,46],[9.18,46.44],[10.36,46.48]],[[14.76,38.14],[15.52,38.23],[15.16,37.44],[15.31,37.13],[15.1,36.62],[14.33,37],[13.83,37.1],[12.43,37.61],[12.57,38.13],[13.74,38.04],[14.76,38.14]],[[8.71,40.9],[9.21,41.21],[9.81,40.5],[9.67,39.18],[9.21,39.24],[8.81,38.91],[8.43,39.17],[8.39,40.38],[8.16,40.95],[8.71,40.9]],[[9.92,54.98],[9.28,54.83],[8.53,54.96],[8.12,55.52],[8.09,56.54],[8.26,56.81],[8.54,57.11],[9.42,57.17],[9.78,57.45],[10.58,57.73],[10.55,57.22],[10.25,56.89],[10.37,56.61],[10.91,56.46],[10.67,56.08],[10.37,56.19],[9.65,55.47],[9.92,54.98]],[[12.37,56.11],[12.69,55.61],[12.09,54.8],[11.04,55.36],[10.9,55.78],[12.37,56.11]],[[-6.2,53.87],[-6.95,54.07],[-7.57,54.06],[-7.37,54.6],[-7.57,55.13],[-6.73,55.17],[-5.66,54.56],[-6.2,53.87]],[[-3.09,53.4],[-3.09,53.4],[-2.95,53.98],[-3.62,54.6],[-3.63,54.61],[-4.84,54.79],[-5.08,55.06],[-4.72,55.51],[-5.05,55.78],[-5.59,55.31],[-5.65,56.27],[-6.15,56.78],[-5.79,57.82],[-5.01,58.63],[-4.21,58.55],[-3,58.63],[-4.07,57.55],[-3.05,57.69],[-1.96,57.68],[-2.22,56.87],[-3.12,55.97],[-2.09,55.91],[-2.01,55.8],[-1.11,54.62],[-0.43,54.46],[0.19,53.32],[0.47,52.93],[1.68,52.74],[1.56,52.1],[1.05,51.81],[1.45,51.29],[0.55,50.77],[-0.79,50.78],[-2.49,50.5],[-2.96,50.7],[-3.62,50.23],[-4.54,50.34],[-5.24,49.96],[-5.78,50.16],[-4.31,51.21],[-3.41,51.43],[-3.42,51.43],[-4.98,51.59],[-5.27,51.99],[-4.22,52.3],[-4.77,52.84],[-4.58,53.5],[-3.09,53.4]],[[-14.51,66.46],[-14.74,65.81],[-13.61,65.13],[-14.91,64.36],[-17.79,63.68],[-18.66,63.5],[-19.97,63.64],[-22.76,63.96],[-21.78,64.4],[-23.96,64.89],[-22.19,65.08],[-22.23,65.38],[-24.33,65.61],[-23.65,66.26],[-22.13,66.41],[-20.58,65.73],[-19.06,66.28],[-17.8,65.99],[-16.17,66.53],[-14.51,66.46]],[[46.41,41.86],[46.69,41.83],[47.37,41.22],[47.81,41.15],[47.99,41.41],[48.58,41.81],[49.11,41.28],[49.62,40.57],[50.09,40.53],[50.39,40.26],[49.57,40.18],[49.39,39.4],[49.22,39.05],[48.86,38.82],[48.88,38.32],[48.63,38.27],[48.01,38.79],[48.35,39.29],[48.06,39.58],[47.68,39.51],[46.51,38.77],[46.48,39.46],[46.04,39.63],[45.61,39.9],[45.89,40.22],[45.36,40.56],[45.56,40.81],[45.18,40.99],[44.97,41.25],[45.22,41.41],[45.96,41.12],[46.5,41.06],[46.64,41.18],[46.15,41.72],[46.41,41.86]],[[46.14,38.74],[45.46,38.87],[44.95,39.34],[44.79,39.71],[45,39.74],[45.3,39.47],[45.74,39.47],[45.74,39.32],[46.14,38.74]],[[39.95,43.44],[40.08,43.55],[40.92,43.38],[42.4,43.22],[43.76,42.74],[43.93,42.55],[44.54,42.71],[45.47,42.5],[45.78,42.09],[46.41,41.86],[46.15,41.72],[46.64,41.18],[46.5,41.06],[45.96,41.12],[45.22,41.41],[44.97,41.25],[43.58,41.09],[42.62,41.58],[41.55,41.54],[41.7,41.96],[41.45,42.64],[40.88,43.01],[40.32,43.13],[39.95,43.44]],[[120.83,12.7],[120.32,13.47],[121.18,13.43],[121.53,13.07],[121.26,12.21],[120.83,12.7]],[[122.59,9.98],[122.84,10.26],[122.95,10.88],[123.5,10.94],[123.34,10.27],[124.08,11.23],[123.98,10.28],[123.62,9.95],[123.31,9.32],[123,9.02],[122.38,9.71],[122.59,9.98]],[[126.38,8.41],[126.48,7.75],[126.54,7.19],[126.2,6.27],[125.83,7.29],[125.36,6.79],[125.68,6.05],[125.4,5.58],[124.22,6.16],[123.94,6.89],[124.24,7.36],[123.61,7.83],[123.3,7.42],[122.82,7.46],[122.09,6.9],[121.92,7.19],[122.31,8.04],[122.94,8.32],[123.49,8.69],[123.84,8.24],[124.6,8.51],[124.76,8.96],[125.47,8.99],[125.41,9.76],[126.22,9.29],[126.31,8.78],[126.38,8.41]],[[118.5,9.32],[117.18,8.37],[117.67,9.07],[118.39,9.68],[118.99,10.38],[119.51,11.37],[119.69,10.55],[119.03,10],[118.5,9.32]],[[122.34,18.22],[122.17,17.81],[122.51,17.09],[122.25,16.26],[121.66,15.93],[121.51,15.13],[121.73,14.33],[122.26,14.22],[122.7,14.34],[123.95,13.78],[123.85,13.24],[124.18,13],[124.08,12.54],[123.3,13.03],[122.93,13.55],[122.67,13.19],[122.04,13.78],[121.13,13.64],[120.63,13.86],[120.68,14.27],[120.99,14.53],[120.69,14.76],[120.56,14.4],[120.07,14.97],[119.92,15.41],[119.88,16.36],[120.29,16.03],[120.39,17.6],[120.71,18.51],[121.32,18.5],[121.94,18.22],[122.24,18.48],[122.34,18.22]],[[122.04,11.42],[121.88,11.89],[122.48,11.58],[123.12,11.58],[123.1,11.17],[122.64,10.74],[122,10.44],[121.97,10.91],[122.04,11.42]],[[125.5,12.16],[125.78,11.05],[125.01,11.31],[125.03,10.98],[125.28,10.36],[124.8,10.13],[124.76,10.84],[124.46,10.89],[124.3,11.49],[124.89,11.42],[124.88,11.79],[124.27,12.56],[125.23,12.54],[125.5,12.16]],[[100.09,6.46],[100.26,6.64],[101.08,6.21],[101.16,5.69],[101.81,5.81],[102.14,6.22],[102.37,6.13],[102.96,5.53],[103.38,4.85],[103.44,4.18],[103.33,3.73],[103.43,3.38],[103.5,2.79],[103.86,2.52],[104.25,1.63],[104.23,1.29],[103.52,1.23],[102.57,1.97],[101.39,2.76],[101.27,3.27],[100.69,3.94],[100.56,4.77],[100.2,5.31],[100.31,6.04],[100.09,6.46]],[[117.88,4.14],[117.01,4.31],[115.87,4.31],[115.52,3.17],[115.13,2.82],[114.62,1.43],[113.81,1.22],[112.86,1.5],[112.38,1.41],[111.8,0.9],[111.16,0.98],[110.52,0.77],[109.83,1.34],[109.66,2.01],[110.4,1.66],[111.17,1.85],[111.37,2.7],[111.8,2.89],[113,3.1],[113.71,3.89],[114.21,4.53],[114.66,4.01],[114.87,4.35],[115.35,4.32],[115.4,4.95],[115.45,5.45],[116.22,6.14],[116.73,6.92],[117.13,6.93],[117.64,6.42],[117.69,5.99],[118.35,5.71],[119.18,5.41],[119.11,5.02],[118.44,4.97],[118.62,4.48],[117.88,4.14]],[[115.45,5.45],[115.4,4.95],[115.35,4.32],[114.87,4.35],[114.66,4.01],[114.21,4.53],[114.6,4.9],[115.45,5.45]],[[13.81,46.51],[14.63,46.43],[15.14,46.66],[16.01,46.68],[16.2,46.85],[16.37,46.84],[16.57,46.5],[15.77,46.24],[15.67,45.83],[15.32,45.73],[15.33,45.45],[14.93,45.47],[14.6,45.64],[14.41,45.47],[13.71,45.5],[13.94,45.59],[13.7,46.02],[13.81,46.51]],[[28.59,69.07],[28.45,68.36],[29.98,67.7],[29.05,66.94],[30.22,65.81],[29.54,64.95],[30.44,64.2],[30.04,63.55],[31.52,62.87],[31.14,62.36],[30.21,61.78],[28.07,60.5],[26.26,60.42],[24.5,60.06],[22.87,59.85],[22.29,60.39],[21.32,60.72],[21.54,61.7],[21.06,62.61],[21.54,63.19],[22.44,63.82],[24.73,64.9],[25.4,65.11],[25.3,65.53],[23.9,66.01],[23.57,66.4],[23.54,67.94],[21.98,68.62],[20.64,69.11],[21.25,69.37],[22.36,68.84],[23.66,68.89],[24.73,68.65],[25.69,69.09],[26.18,69.83],[27.73,70.16],[29.01,69.77],[28.59,69.07]],[[22.56,49.09],[22.28,48.83],[22.08,48.42],[21.87,48.32],[20.8,48.62],[20.48,48.56],[20.24,48.33],[19.77,48.2],[19.66,48.27],[19.18,48.11],[18.78,48.08],[18.7,47.88],[17.86,47.76],[17.49,47.87],[16.98,48.12],[16.88,48.47],[16.96,48.6],[17.1,48.82],[17.54,48.8],[17.89,48.9],[17.91,49],[18.11,49.04],[18.17,49.27],[18.4,49.31],[18.56,49.49],[18.85,49.5],[18.91,49.44],[19.32,49.57],[19.82,49.22],[20.42,49.43],[20.89,49.33],[21.61,49.47],[22.56,49.09]],[[15.02,51.11],[15.49,50.78],[16.24,50.7],[16.18,50.42],[16.72,50.22],[16.87,50.47],[17.56,50.36],[17.65,50.05],[18.39,49.99],[18.85,49.5],[18.56,49.49],[18.4,49.31],[18.17,49.27],[18.11,49.04],[17.91,49],[17.89,48.9],[17.54,48.8],[17.1,48.82],[16.96,48.6],[16.5,48.79],[16.03,48.73],[15.26,49.04],[14.9,48.96],[14.34,48.56],[13.6,48.88],[13.03,49.31],[12.52,49.55],[12.41,49.97],[12.24,50.27],[12.97,50.48],[13.34,50.73],[14.06,50.93],[14.31,51.12],[14.57,51],[15.02,51.11]],[[36.43,14.42],[36.32,14.82],[36.75,16.29],[36.85,16.96],[37.17,17.26],[37.9,17.43],[38.41,18],[38.99,16.84],[39.27,15.92],[39.81,15.44],[41.18,14.49],[41.73,13.92],[42.28,13.34],[42.59,13],[43.08,12.7],[42.78,12.46],[42.35,12.54],[42.01,12.87],[41.6,13.45],[41.15,13.77],[40.9,14.12],[40.03,14.52],[39.34,14.53],[39.1,14.74],[38.51,14.51],[37.91,14.96],[37.59,14.21],[36.43,14.42]],[[141.88,39.18],[140.96,38.17],[140.98,37.14],[140.6,36.34],[140.77,35.84],[140.25,35.14],[138.97,34.67],[137.22,34.61],[135.79,33.46],[135.12,33.85],[135.08,34.6],[133.34,34.38],[132.16,33.9],[130.99,33.89],[132,33.15],[131.33,31.45],[130.69,31.03],[130.2,31.42],[130.45,32.32],[129.82,32.61],[129.41,33.3],[130.36,33.6],[130.88,34.23],[131.89,34.75],[132.62,35.43],[134.61,35.73],[135.68,35.53],[136.72,37.3],[137.39,36.83],[138.86,37.83],[139.43,38.22],[140.05,39.44],[139.88,40.56],[140.31,41.2],[141.37,41.38],[141.92,39.99],[141.88,39.18]],[[144.61,43.96],[145.32,44.38],[145.54,43.26],[144.06,42.99],[143.18,41.99],[141.61,42.68],[141.07,41.59],[139.96,41.57],[139.82,42.56],[140.31,43.33],[141.38,43.39],[141.67,44.77],[141.97,45.55],[143.14,44.51],[143.91,44.17],[144.61,43.96]],[[132.37,33.46],[132.93,34.06],[133.49,33.94],[133.91,34.36],[134.64,34.15],[134.77,33.81],[134.2,33.2],[133.79,33.52],[133.28,33.29],[133.02,32.7],[132.36,32.99],[132.37,33.46]],[[-58.17,-20.18],[-57.87,-20.73],[-57.94,-22.09],[-56.88,-22.28],[-56.47,-22.09],[-55.8,-22.36],[-55.61,-22.66],[-55.52,-23.57],[-55.4,-23.96],[-55.03,-24],[-54.65,-23.84],[-54.29,-24.02],[-54.29,-24.57],[-54.43,-25.16],[-54.63,-25.74],[-54.79,-26.62],[-55.69,-27.39],[-56.49,-27.55],[-57.61,-27.4],[-58.62,-27.12],[-57.63,-25.6],[-57.78,-25.16],[-58.81,-24.77],[-60.03,-24.03],[-60.85,-23.88],[-62.69,-22.25],[-62.29,-21.05],[-62.26,-20.51],[-61.79,-19.63],[-60.04,-19.34],[-59.11,-19.36],[-58.18,-19.87],[-58.17,-20.18]],[[52,19],[52.78,17.35],[53.11,16.65],[52.39,16.38],[52.19,15.94],[52.17,15.6],[51.17,15.18],[49.57,14.71],[48.68,14],[48.24,13.95],[47.94,14.01],[47.35,13.59],[46.72,13.4],[45.88,13.35],[45.63,13.29],[45.41,13.03],[45.14,12.95],[44.99,12.7],[44.49,12.72],[44.17,12.59],[43.48,12.64],[43.22,13.22],[43.25,13.77],[43.09,14.06],[42.89,14.8],[42.6,15.21],[42.81,15.26],[42.7,15.72],[42.82,15.91],[42.78,16.35],[43.22,16.67],[43.12,17.09],[43.38,17.58],[43.79,17.32],[44.06,17.41],[45.22,17.43],[45.4,17.33],[46.37,17.23],[46.75,17.28],[47,16.95],[47.47,17.12],[48.18,18.17],[49.12,18.62],[52,19]],[[34.95,29.36],[36.5,29.51],[37.5,30],[38,30.51],[39,32.01],[40.4,31.89],[44.71,29.18],[47.46,29],[48.42,28.55],[49.3,27.46],[50.15,26.69],[50.11,25.94],[50.53,25.33],[50.81,24.75],[51.39,24.63],[51.62,24.01],[55.01,22.5],[55.67,22],[52,19],[48.18,18.17],[47,16.95],[46.37,17.23],[45.22,17.43],[43.79,17.32],[43.12,17.09],[42.78,16.35],[42.35,17.08],[41.76,17.83],[40.94,19.49],[39.8,20.34],[39.02,21.99],[38.49,23.69],[37.49,24.29],[37.21,25.08],[36.64,25.83],[35.64,27.38],[34.63,28.06],[34.83,28.96]],[[32.73,35.14],[32.8,35.14],[32.95,35.39],[33.67,35.37],[34.58,35.67],[33.9,35.25],[33.98,35.06],[33.87,35.09],[33.68,35.02],[33.53,35.04],[33.47,35],[33.46,35.1],[33.38,35.16],[33.19,35.17],[32.92,35.09],[32.73,35.14]],[[32.73,35.14],[32.92,35.09],[33.19,35.17],[33.38,35.16],[33.46,35.1],[33.47,35],[33.53,35.04],[33.68,35.02],[33.87,35.09],[33.98,35.06],[34,34.98],[32.98,34.57],[32.49,34.7],[32.26,35.1],[32.73,35.14]],[[-2.17,35.17],[-1.73,33.92],[-1.13,32.65],[-2.62,32.09],[-3.65,31.64],[-4.86,30.5],[-6.06,29.73],[-8.67,28.84],[-8.82,27.66],[-9.41,27.09],[-10.19,26.86],[-11.39,26.88],[-12.03,26.03],[-13.89,23.69],[-14.63,21.86],[-17,21.42],[-16.97,21.89],[-16.26,22.68],[-15.98,23.72],[-15.09,24.52],[-14.8,25.64],[-13.78,26.62],[-13.12,27.65],[-11.69,28.15],[-10.4,29.1],[-9.82,31.18],[-9.3,32.57],[-7.66,33.7],[-6.24,35.15],[-5.19,35.76],[-3.64,35.4],[-2.17,35.17]],[[36.87,22],[32.9,22],[29.02,22],[25,22],[25,25.68],[25,29.24],[24.7,30.04],[24.96,30.66],[24.8,31.09],[25.17,31.57],[26.49,31.59],[27.46,31.32],[28.45,31.03],[28.91,30.87],[29.68,31.19],[30.09,31.47],[30.98,31.56],[31.69,31.43],[31.96,30.93],[32.19,31.26],[32.99,31.02],[33.77,30.97],[34.27,31.22],[34.82,29.76],[34.92,29.5],[34.64,29.1],[34.43,28.34],[34.16,27.82],[33.92,27.65],[33.59,27.97],[33.14,28.42],[32.42,29.85],[32.32,29.76],[32.73,28.7],[33.35,27.7],[34.1,26.14],[34.47,25.6],[34.8,25.03],[35.69,23.93],[35.49,23.75],[35.53,23.1],[36.69,22.21],[36.87,22]],[[25,22],[25,20],[23.85,20],[23.84,19.58],[19.85,21.49],[15.86,23.41],[14.85,22.86],[14.14,22.49],[13.58,23.04],[12,23.47],[11.56,24.1],[10.77,24.56],[10.31,24.38],[9.95,24.94],[9.91,25.37],[9.32,26.09],[9.71,26.51],[9.63,27.14],[9.76,27.69],[9.68,28.14],[9.86,28.96],[9.8,29.42],[9.48,30.31],[9.97,30.54],[10.06,30.96],[9.95,31.38],[10.64,31.76],[10.95,32.08],[11.43,32.37],[11.49,33.14],[12.66,32.79],[13.08,32.88],[13.92,32.71],[15.24,32.27],[15.71,31.38],[16.61,31.18],[18.02,30.76],[19.09,30.27],[19.58,30.53],[20.05,30.99],[19.82,31.75],[20.13,32.24],[20.85,32.71],[21.54,32.84],[22.89,32.64],[23.24,32.19],[23.61,32.19],[23.93,32.02],[24.92,31.9],[25.17,31.57],[24.8,31.09],[24.96,30.66],[24.7,30.04],[25,29.24],[25,25.68],[25,22]],[[47.79,8],[44.96,5],[43.66,4.96],[42.77,4.25],[42.13,4.23],[41.86,3.92],[41.17,3.92],[40.77,4.26],[39.85,3.84],[39.56,3.42],[38.89,3.5],[38.67,3.62],[38.44,3.59],[38.12,3.6],[36.86,4.45],[36.16,4.45],[35.82,4.78],[35.82,5.34],[35.3,5.51],[34.71,6.59],[34.25,6.83],[34.08,7.23],[33.57,7.71],[32.95,7.78],[33.29,8.36],[33.82,8.38],[33.98,8.69],[33.96,9.58],[34.26,10.63],[34.73,10.91],[34.83,11.32],[35.26,12.08],[35.87,12.58],[36.27,13.56],[36.43,14.42],[37.59,14.21],[37.91,14.96],[38.51,14.51],[39.1,14.74],[39.34,14.53],[40.03,14.52],[40.9,14.12],[41.15,13.77],[41.6,13.45],[42.01,12.87],[42.35,12.54],[42,12.1],[41.66,11.63],[41.74,11.36],[41.76,11.05],[42.31,11.03],[42.55,11.11],[42.78,10.93],[42.56,10.57],[42.93,10.02],[43.3,9.54],[43.68,9.18],[46.95,8],[47.79,8]],[[42.35,12.54],[42.78,12.46],[43.08,12.7],[43.32,12.39],[43.29,11.98],[42.72,11.74],[43.14,11.46],[42.78,10.93],[42.55,11.11],[42.31,11.03],[41.76,11.05],[41.74,11.36],[41.66,11.63],[42,12.1],[42.35,12.54]],[[48.95,11.41],[48.94,11.39],[48.94,10.98],[48.94,9.97],[48.94,9.45],[48.49,8.84],[47.79,8],[46.95,8],[43.68,9.18],[43.3,9.54],[42.93,10.02],[42.56,10.57],[42.78,10.93],[43.14,11.46],[43.47,11.28],[43.67,10.86],[44.12,10.45],[44.61,10.44],[45.56,10.7],[46.64,10.82],[47.53,11.13],[48.02,11.19],[48.38,11.38],[48.95,11.41]],[[33.9,-0.95],[31.87,-1.03],[30.77,-1.01],[30.42,-1.14],[29.82,-1.44],[29.58,-1.34],[29.59,-0.59],[29.82,-0.21],[29.87,0.6],[30.09,1.06],[30.47,1.58],[30.85,1.85],[31.17,2.2],[30.77,2.34],[30.83,3.51],[31.25,3.78],[31.88,3.56],[32.69,3.79],[33.39,3.79],[34,4.25],[34.48,3.55],[34.59,3.05],[35.04,1.91],[34.67,1.18],[34.18,0.52],[33.89,0.11],[33.9,-0.95]],[[30.42,-1.14],[30.81,-1.7],[30.76,-2.29],[30.47,-2.41],[29.94,-2.35],[29.63,-2.92],[29.03,-2.84],[29.12,-2.29],[29.26,-2.21],[29.29,-1.62],[29.58,-1.34],[29.82,-1.44],[30.42,-1.14]],[[18.56,42.65],[17.67,43.03],[17.3,43.45],[16.91,43.67],[16.46,44.04],[16.24,44.35],[15.75,44.82],[15.96,45.23],[16.32,45],[16.53,45.21],[17,45.23],[17.86,45.07],[18.55,45.08],[19.01,44.86],[19.37,44.86],[19.12,44.42],[19.6,44.04],[19.45,43.57],[19.22,43.52],[19.03,43.43],[18.71,43.2],[18.56,42.65]],[[22.38,42.32],[22.88,42],[22.95,41.34],[22.76,41.3],[22.6,41.13],[22.06,41.15],[21.67,40.93],[21.02,40.84],[20.6,41.09],[20.46,41.52],[20.59,41.86],[20.72,41.85],[20.76,42.05],[21.35,42.21],[21.58,42.25],[21.92,42.3],[22.38,42.32]],[[18.83,45.91],[19.6,46.17],[20.22,46.13],[20.76,45.74],[20.87,45.42],[21.48,45.18],[21.56,44.77],[22.15,44.48],[22.46,44.7],[22.71,44.58],[22.47,44.41],[22.66,44.24],[22.41,44.01],[22.5,43.64],[22.98,43.21],[22.61,42.9],[22.44,42.58],[22.55,42.46],[22.38,42.32],[21.92,42.3],[21.58,42.25],[21.54,42.32],[21.66,42.44],[21.77,42.68],[21.63,42.68],[21.44,42.86],[21.27,42.91],[21.14,43.07],[20.96,43.13],[20.81,43.27],[20.63,43.22],[20.5,42.88],[20.26,42.81],[20.34,42.9],[19.96,43.11],[19.63,43.21],[19.49,43.35],[19.22,43.52],[19.45,43.57],[19.6,44.04],[19.12,44.42],[19.37,44.86],[19.01,44.86],[19.39,45.24],[19.07,45.52],[18.83,45.91]],[[20.07,42.59],[19.8,42.5],[19.74,42.69],[19.31,42.2],[19.37,41.88],[19.16,41.96],[18.88,42.28],[18.45,42.48],[18.56,42.65],[18.71,43.2],[19.03,43.43],[19.22,43.52],[19.49,43.35],[19.63,43.21],[19.96,43.11],[20.34,42.9],[20.26,42.81],[20.07,42.59]],[[20.59,41.86],[20.52,42.22],[20.28,42.32],[20.07,42.59],[20.26,42.81],[20.5,42.88],[20.63,43.22],[20.81,43.27],[20.96,43.13],[21.14,43.07],[21.27,42.91],[21.44,42.86],[21.63,42.68],[21.77,42.68],[21.66,42.44],[21.54,42.32],[21.58,42.25],[21.35,42.21],[20.76,42.05],[20.72,41.85],[20.59,41.86]],[[-61.68,10.76],[-61.11,10.89],[-60.9,10.85],[-60.94,10.11],[-61.77,10],[-61.95,10.09],[-61.66,10.37],[-61.68,10.76]],[[30.83,3.51],[29.72,4.6],[28.7,4.46],[27.98,4.41],[27.21,5.55],[26.21,6.55],[25.12,7.5],[24.57,8.23],[24.19,8.73],[24.8,9.81],[25.79,10.41],[26.48,9.55],[27.11,9.64],[27.97,9.4],[29,9.6],[29.62,10.08],[30.84,9.71],[31.85,10.53],[32.32,11.68],[32.68,12.02],[33.21,12.18],[33.21,10.72],[33.84,9.98],[33.96,9.46],[33.82,8.38],[32.95,7.78],[34.08,7.23],[34.71,6.59],[34.62,4.85],[33.39,3.79],[31.88,3.56],[30.83,3.51]]];

// A sliding toggle switch, styled to match the app rather than a plain
// checkbox — used for yes/no preference settings like the promotional-
// material opt-in.
function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? ROYAL : PARCHMENT_DEEP,
        border: `1px solid ${checked ? ROYAL : BRASS}`,
        position: "relative",
        transition: "background 200ms ease, border-color 200ms ease",
        flexShrink: 0,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          transition: "left 200ms ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

// Converts lat/lon to a 3D point on a sphere of the given radius.
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Builds a ring of points along a line of latitude or a meridian, used for
// the graticule (lat/lon grid) — real three.js line geometry.
function graticuleRing(kind, angleDeg, radius, segments = 96) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    if (kind === "lat") {
      const phi = (90 - angleDeg) * (Math.PI / 180);
      const r = radius * Math.sin(phi);
      const y = radius * Math.cos(phi);
      pts.push(new THREE.Vector3(r * Math.cos(t), y, r * Math.sin(t)));
    } else {
      pts.push(new THREE.Vector3(radius * Math.sin(t) * Math.cos((angleDeg * Math.PI) / 180), radius * Math.cos(t), radius * Math.sin(t) * Math.sin((angleDeg * Math.PI) / 180)));
    }
  }
  return pts;
}

// Converts the real, accurate country-boundary rings (decoded from actual
// Natural Earth / TopoJSON data, not approximated) into one THREE.LineSegments
// geometry drawn on the sphere's surface. Segments that cross the antimeridian
// (±180° longitude) are skipped defensively — those two points are actually
// geographically adjacent, but connecting them naively could occasionally
// produce a stray long chord, so we just leave a tiny, invisible gap there.
function buildRealCountryLineGeometry(rings, radius) {
  const positions = [];
  rings.forEach((ring) => {
    for (let i = 0; i < ring.length; i++) {
      const [lon1, lat1] = ring[i];
      const [lon2, lat2] = ring[(i + 1) % ring.length];
      if (Math.abs(lon1 - lon2) > 180) continue;
      const v1 = latLonToVector3(lat1, lon1, radius);
      const v2 = latLonToVector3(lat2, lon2, radius);
      positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

// A real, draggable, scroll-to-zoom 3D globe — built directly on three.js
// primitives (no OrbitControls, no external globe texture/library). Country
// and coastline outlines are real geographic data (Natural Earth, 110m),
// decoded from an uploaded TopoJSON file — not hand-approximated. Styled as
// a brass-on-navy antique globe to match the school's crest aesthetic.
// Drag to rotate, scroll/pinch to zoom, click a pin to select that city.
// Precomputed camera rotation to bring each city to dead-center facing the
// viewer, upright — solved numerically offline (not at runtime) for every
// city in CITY_COORDS, using the same verified approach used to center the
// globe on the US by default. Looked up when a city is selected, so the
// globe can smoothly animate to it rather than just leaving a static pin.
const CITY_FOCUS_ROTATIONS = {"Atlanta": {"rotX": 0.589, "rotY": -0.0979}, "Austin": {"rotX": 0.5283, "rotY": 0.1351}, "Boston": {"rotX": 0.7393, "rotY": -0.3306}, "Charlotte": {"rotX": 0.6148, "rotY": -0.1598}, "Chicago": {"rotX": 0.7309, "rotY": -0.0414}, "Columbus": {"rotX": 0.6975, "rotY": -0.1222}, "Dallas": {"rotX": 0.5721, "rotY": 0.1186}, "Denver": {"rotX": 0.6936, "rotY": 0.2616}, "Detroit": {"rotX": 0.7388, "rotY": -0.1214}, "Dubai": {"rotX": 0.4399, "rotY": -2.5355}, "El Paso": {"rotX": 0.5543, "rotY": 0.2877}, "Fort Worth": {"rotX": 0.5717, "rotY": 0.1279}, "Hong Kong": {"rotX": 0.3895, "rotY": 2.7198}, "Houston": {"rotX": 0.5194, "rotY": 0.0937}, "Indianapolis": {"rotX": 0.6941, "rotY": -0.0671}, "Jacksonville": {"rotX": 0.5294, "rotY": -0.1456}, "Las Vegas": {"rotX": 0.6313, "rotY": 0.4388}, "London": {"rotX": 0.899, "rotY": -1.5686}, "Los Angeles": {"rotX": 0.5943, "rotY": 0.4929}, "Louisville": {"rotX": 0.6676, "rotY": -0.074}, "Memphis": {"rotX": 0.6135, "rotY": 0.0009}, "Miami": {"rotX": 0.4496, "rotY": -0.1712}, "Nashville": {"rotX": 0.6312, "rotY": -0.0562}, "New York": {"rotX": 0.7106, "rotY": -0.2792}, "Oklahoma City": {"rotX": 0.619, "rotY": 0.1312}, "Paris": {"rotX": 0.8527, "rotY": -1.6118}, "Philadelphia": {"rotX": 0.6973, "rotY": -0.2589}, "Phoenix": {"rotX": 0.5838, "rotY": 0.3853}, "Portland": {"rotX": 0.7944, "rotY": 0.5703}, "San Antonio": {"rotX": 0.5135, "rotY": 0.1482}, "San Diego": {"rotX": 0.571, "rotY": 0.4741}, "San Francisco": {"rotX": 0.6593, "rotY": 0.5658}, "San Jose": {"rotX": 0.6517, "rotY": 0.5565}, "Seattle": {"rotX": 0.8309, "rotY": 0.5643}, "Singapore": {"rotX": 0.0236, "rotY": 2.9004}, "Tokyo": {"rotX": 0.6227, "rotY": 2.275}, "Toronto": {"rotX": 0.7619, "rotY": -0.1853}, "Washington, D.C.": {"rotX": 0.6791, "rotY": -0.2262}};

function Globe3D({ cityPoints, maxCount, selectedCity, onSelectCity }) {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const [label, setLabel] = useState(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const RADIUS = 2.4;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 6.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Ocean sphere
    const sphereGeo = new THREE.SphereGeometry(RADIUS, 48, 48);
    const sphereMat = new THREE.MeshPhongMaterial({ color: new THREE.Color(INK_DEEP), shininess: 12, transparent: true, opacity: 0.97 });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(sphere);

    // Graticule (lat/lon lines) — subtle, secondary to the real coastlines
    const graticuleMat = new THREE.LineBasicMaterial({ color: new THREE.Color(BRASS), transparent: true, opacity: 0.14 });
    const equatorMat = new THREE.LineBasicMaterial({ color: new THREE.Color(BRASS_LIGHT), transparent: true, opacity: 0.28 });
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = graticuleRing("lat", lat, RADIUS * 1.002);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      globeGroup.add(new THREE.LineLoop(geo, lat === 0 ? equatorMat : graticuleMat));
    }
    for (let lon = 0; lon < 180; lon += 30) {
      const pts = graticuleRing("lon", lon, RADIUS * 1.002);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      globeGroup.add(new THREE.LineLoop(geo, graticuleMat));
    }

    // Real country/coastline outlines — the main visual
    const landGeo = buildRealCountryLineGeometry(REAL_COUNTRY_RINGS, RADIUS * 1.003);
    const landMat = new THREE.LineBasicMaterial({ color: new THREE.Color(PARCHMENT), transparent: true, opacity: 0.9 });
    globeGroup.add(new THREE.LineSegments(landGeo, landMat));

    // Decorative crest emblems, sprinkled across open ocean — same "B"
    // shield used throughout the app (not the school's real crest), colored
    // to match the coastlines and kept very faint so they read clearly as
    // background decoration, drawn as flat decals wrapped onto the sphere's
    // surface (not billboards) with a consistent, north-up orientation.
    const crestCanvas = document.createElement("canvas");
    crestCanvas.width = 128;
    crestCanvas.height = 128;
    const cctx = crestCanvas.getContext("2d");
    cctx.clearRect(0, 0, 128, 128);
    cctx.strokeStyle = PARCHMENT;
    cctx.fillStyle = PARCHMENT;
    cctx.lineWidth = 4;
    cctx.globalAlpha = 1;
    const shieldPts = [[64, 2], [116, 26], [116, 76], [64, 126], [12, 76], [12, 26]];
    cctx.beginPath();
    cctx.moveTo(shieldPts[0][0], shieldPts[0][1]);
    shieldPts.slice(1).forEach(([x, y]) => cctx.lineTo(x, y));
    cctx.closePath();
    cctx.stroke();
    cctx.beginPath();
    cctx.arc(64, 70, 24, 0, Math.PI * 2);
    cctx.stroke();
    cctx.font = "italic bold 40px Georgia, serif";
    cctx.textAlign = "center";
    cctx.textBaseline = "middle";
    cctx.fillText("B", 64, 72);
    const crestTexture = new THREE.CanvasTexture(crestCanvas);
    // Avoid mipmap blur / interpolation halo, which is what reads as a
    // faint white blob against the dark ocean once scaled up.
    crestTexture.generateMipmaps = false;
    crestTexture.minFilter = THREE.LinearFilter;
    crestTexture.magFilter = THREE.LinearFilter;

    // A uniform 20°-latitude grid, verified with an actual point-in-polygon
    // test against REAL_COUNTRY_RINGS — the same real coastline data used to
    // draw the globe itself — rather than eyeballed (that's exactly how
    // decals ended up on land before). Each candidate is checked with a
    // ~10° safety margin around it, not just its exact center, since each
    // decal has visible width and a point just barely offshore can still
    // have its edge overlap the coastline. Rows run from 55°S to 65°N;
    // below/above that is Antarctica and the high Arctic, which this
    // decorative grid skips.
    const OCEAN_CRESTS = [[-55,-160],[-55,-140],[-55,-120],[-55,-100],[-55,-40],[-55,-20],[-55,0],[-55,20],[-55,40],[-55,60],[-55,80],[-55,100],[-55,120],[-55,140],[-35,-160],[-35,-140],[-35,-120],[-35,-100],[-35,-20],[-35,0],[-35,60],[-35,80],[-35,100],[-15,-180],[-15,-160],[-15,-140],[-15,-120],[-15,-100],[-15,-20],[-15,0],[-15,80],[-15,100],[5,-180],[5,-160],[5,-140],[5,-120],[5,160],[25,-180],[25,-160],[25,-140],[25,-60],[25,-40],[25,140],[25,160],[45,-180],[45,-160],[45,-40],[45,-20],[65,-180]];
    const crestMeshes = [];
    const crestMat = new THREE.MeshBasicMaterial({
      map: crestTexture,
      transparent: true,
      opacity: 0.16, // faint — reads as background texture, not a focal point
      depthWrite: false,
      alphaTest: 0.02, // discards fully-transparent background only — must stay below opacity, or everything gets clipped
      side: THREE.FrontSide,
    });
    const worldUp = new THREE.Vector3(0, 1, 0);
    OCEAN_CRESTS.forEach(([lat, lon]) => {
      const geo = new THREE.PlaneGeometry(0.5, 0.5);
      const mesh = new THREE.Mesh(geo, crestMat);
      const pos = latLonToVector3(lat, lon, RADIUS * 1.004);
      mesh.position.copy(pos);
      // Build a basis where the plane's normal is the outward radial
      // direction (flush with the sphere) and "up" is geographic north
      // projected onto the local tangent plane — so every decal has the
      // same consistent, right-side-up orientation, not an arbitrary spin.
      const normal = pos.clone().normalize();
      const up = worldUp.clone().sub(normal.clone().multiplyScalar(worldUp.dot(normal))).normalize();
      const right = new THREE.Vector3().crossVectors(up, normal).normalize();
      const basis = new THREE.Matrix4().makeBasis(right, up, normal);
      mesh.quaternion.setFromRotationMatrix(basis);
      globeGroup.add(mesh);
      crestMeshes.push(mesh);
    });

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(4, 3, 5);
    scene.add(dirLight);

    // Pins
    const pinMeshes = [];
    cityPoints.forEach((c) => {
      const pos = latLonToVector3(c.coords[0], c.coords[1], RADIUS * 1.02);
      const r = 0.035 + (c.members.length / maxCount) * 0.09;
      const geo = new THREE.SphereGeometry(r, 16, 16);
      const mat = new THREE.MeshPhongMaterial({ color: new THREE.Color(ROYAL_LIGHT), emissive: new THREE.Color(ROYAL), emissiveIntensity: 0.4 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.userData = { city: c.city, count: c.members.length };
      globeGroup.add(mesh);
      pinMeshes.push(mesh);
    });

    // Interaction state
    let isDragging = false;
    let lastX = 0, lastY = 0;
    let moved = 0;
    // Starting orientation: solved numerically so the globe opens facing
    // the continental United States dead-center, right-side up (there are
    // two mathematically valid rotations that center any given point — one
    // upright, one upside-down — this is specifically the upright one,
    // verified by checking the globe's north pole ends up pointing up).
    let rotY = 0.1396, rotX = 0.6807;
    let autoRotate = true;
    let zoom = 6.5;
    const ZOOM_MIN = 3.4, ZOOM_MAX = 10;
    globeGroup.rotation.y = rotY;
    globeGroup.rotation.x = rotX;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function onPointerDown(e) {
      isDragging = true;
      autoRotate = false;
      stateRef.current.focusTarget = null;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
    }
    function onPointerMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      rotY += dx * 0.005;
      rotX = Math.max(-1.3, Math.min(1.3, rotX + dy * 0.005));
      lastX = e.clientX;
      lastY = e.clientY;
    }
    function onPointerUp(e) {
      if (isDragging && moved < 5) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(pinMeshes);
        if (hits.length) onSelectCity(hits[0].object.userData.city);
      }
      isDragging = false;
    }
    function onWheel(e) {
      e.preventDefault();
      stateRef.current.focusTarget = null;
      zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom + e.deltaY * 0.005));
    }
    // Hover: shows the city name and swaps the cursor to a plain arrow when
    // directly over a pin, independent of drag/click handling above.
    function onHoverMove(e) {
      if (isDragging) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pinMeshes);
      if (hits.length) {
        stateRef.current.hoveredCity = hits[0].object.userData.city;
        dom.style.cursor = "default";
      } else {
        stateRef.current.hoveredCity = null;
        dom.style.cursor = "grab";
      }
    }
    function onHoverLeave() {
      stateRef.current.hoveredCity = null;
      dom.style.cursor = "grab";
    }

    const dom = renderer.domElement;
    dom.style.touchAction = "none";
    dom.style.cursor = "grab";
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("wheel", onWheel, { passive: false });
    dom.addEventListener("mousemove", onHoverMove);
    dom.addEventListener("mouseleave", onHoverLeave);

    function handleResize() {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", handleResize);

    let frameId;
    const tmpVec = new THREE.Vector3();
    const FOCUS_ZOOM = 4.2; // closer than the default 6.5, but still shows plenty of context
    // Shortest-path angle interpolation — without this, rotating from e.g.
    // 3.0 rad to -3.0 rad would spin the long way around instead of the
    // short way, since they're actually close together on the circle.
    function lerpAngle(current, target, t) {
      let delta = ((target - current + Math.PI) % (2 * Math.PI)) - Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      return current + delta * t;
    }
    function animate() {
      frameId = requestAnimationFrame(animate);

      // Smoothly fly the camera to a newly selected city, if it has a
      // precomputed focus rotation. Runs once per new selection (not every
      // frame) via the lastFocusedCity guard, then eases toward it here.
      if (stateRef.current.selectedCity !== stateRef.current.lastFocusedCity) {
        stateRef.current.lastFocusedCity = stateRef.current.selectedCity;
        const focus = stateRef.current.selectedCity && CITY_FOCUS_ROTATIONS[stateRef.current.selectedCity];
        if (focus) {
          stateRef.current.focusTarget = { rotX: focus.rotX, rotY: focus.rotY, zoom: FOCUS_ZOOM };
          autoRotate = false;
        }
      }
      if (stateRef.current.focusTarget && !isDragging) {
        const t = stateRef.current.focusTarget;
        rotY = lerpAngle(rotY, t.rotY, 0.06);
        rotX = rotX + (t.rotX - rotX) * 0.06;
        zoom = zoom + (t.zoom - zoom) * 0.06;
      }

      if (autoRotate) rotY += 0.0009;
      globeGroup.rotation.y = rotY;
      globeGroup.rotation.x = rotX;
      camera.position.set(0, 0, zoom);
      camera.lookAt(0, 0, 0);

      let activeMesh = null;
      pinMeshes.forEach((m) => {
        const isHovered = m.userData.city === stateRef.current.hoveredCity;
        const isSel = m.userData.city === stateRef.current.selectedCity;
        const targetScale = isHovered || isSel ? 1.6 : 1;
        m.scale.setScalar(m.scale.x + (targetScale - m.scale.x) * 0.15);
        if (isHovered) activeMesh = m;
      });
      if (!activeMesh) {
        pinMeshes.forEach((m) => {
          if (m.userData.city === stateRef.current.selectedCity) activeMesh = m;
        });
      }
      if (activeMesh) {
        tmpVec.copy(activeMesh.position);
        globeGroup.localToWorld(tmpVec);
        tmpVec.project(camera);
        const facingCamera = tmpVec.z < 1;
        const x = (tmpVec.x * 0.5 + 0.5) * mount.clientWidth;
        const y = (-tmpVec.y * 0.5 + 0.5) * mount.clientHeight;
        setLabel(facingCamera ? { x, y, text: `${activeMesh.userData.city} · ${activeMesh.userData.count}` } : null);
      } else {
        setLabel(null);
      }

      renderer.render(scene, camera);
    }
    animate();

    stateRef.current.selectedCity = selectedCity;

    return () => {
      cancelAnimationFrame(frameId);
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("mousemove", onHoverMove);
      dom.removeEventListener("mouseleave", onHoverLeave);
      window.removeEventListener("resize", handleResize);
      pinMeshes.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
      crestMeshes.forEach((m) => m.geometry.dispose());
      crestMat.dispose();
      crestTexture.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      landGeo.dispose();
      landMat.dispose();
      renderer.dispose();
      if (mount.contains(dom)) mount.removeChild(dom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityPoints, maxCount]);

  useEffect(() => {
    stateRef.current.selectedCity = selectedCity;
  }, [selectedCity]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={mountRef} style={{ width: "100%", height: 460, cursor: "grab" }} />
      {label && (
        <div
          style={{
            position: "absolute",
            left: label.x,
            top: label.y - 34,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            background: INK,
            border: `1px solid ${BRASS_LIGHT}`,
            borderRadius: 2,
            padding: "3px 8px",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 11,
            color: PARCHMENT,
            whiteSpace: "nowrap",
          }}
        >
          {label.text}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          right: 12,
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: 9,
          letterSpacing: "0.08em",
          color: BRASS_LIGHT,
          opacity: 0.75,
          pointerEvents: "none",
        }}
      >
        DRAG TO ROTATE · SCROLL TO ZOOM
      </div>
    </div>
  );
}


function StatCard({ icon, label, value }) {
  return (
    <div className="p-4 rounded-xl transition-transform hover:-translate-y-0.5" style={{ background: "#fff", border: `1px solid ${PARCHMENT_DEEP}`, boxShadow: SOFT_SHADOW }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: BRASS }}>{icon}<span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em", color: SLATE }}>{label.toUpperCase()}</span></div>
      <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 30, color: INK }}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em", color: SLATE, flexShrink: 0 }}>{label.toUpperCase()}</span>
      <span style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: INK, textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ---------- Main App ----------
export default function App() {
  const [screen, setScreen] = useState("landing"); // landing | login | signup | intro | dashboard | profile
  const [introFadeOut, setIntroFadeOut] = useState(false);
  const [dashboardTab, setDashboardTab] = useState("directory"); // directory | classyear | matriculation | map | aisearch
  const [selectedCity, setSelectedCity] = useState(null);
  const [classYearView, setClassYearView] = useState("alumni"); // alumni | parents
  const [classYearSearch, setClassYearSearch] = useState("");
  const [matriculationView, setMatriculationView] = useState("hs"); // hs | college
  const [matriculationSearch, setMatriculationSearch] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiHistory, setAiHistory] = useState([]);
  const [people, setPeople] = useState([]);
  const [authToken, setAuthToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [fieldFilter, setFieldFilter] = useState("All");
  const [subfieldFilter, setSubfieldFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [authError, setAuthError] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    firstName: "", lastName: "", email: "", password: "",
  });
  const [profileForm, setProfileForm] = useState(null);

  // Loads the directory from the real backend once a user is signed in —
  // there's no seed data anymore, and (per RLS) the API won't return
  // anything to an unauthenticated request anyway, so this only runs once
  // authToken is set (i.e. right after login or signup succeeds).
  const [dataLoaded, setDataLoaded] = useState(true);
  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    setDataLoaded(false);
    fetchProfiles(authToken)
      .then((rows) => { if (!cancelled) setPeople(rows); })
      .catch((err) => { if (!cancelled) setAuthError(err.message); })
      .finally(() => { if (!cancelled) setDataLoaded(true); });
    return () => { cancelled = true; };
  }, [authToken]);

  // Runs the crest intro animation after a successful sign-in, then hands off
  // to the dashboard. Timings: hold on the crest, fade out, then switch.
  useEffect(() => {
    if (screen !== "intro") return;
    setIntroFadeOut(false);
    const t1 = setTimeout(() => setIntroFadeOut(true), 1300);
    const t2 = setTimeout(() => setScreen("dashboard"), 1750);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [screen]);

  // Re-fetches the full directory from the backend after any change
  // (signup, profile edit) — simpler and more reliable than patching the
  // local array by hand, and it's what actually eliminated the duplicate-
  // record class of bugs the old local-array approach kept running into.
  async function refreshPeople(token) {
    const rows = await fetchProfiles(token || authToken);
    setPeople(rows);
    return rows;
  }

  async function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      setAuthError("Enter your email and password to continue.");
      return;
    }
    setAuthError("");
    setAuthLoading(true);
    try {
      const session = await supabaseSignIn(loginForm.email, loginForm.password);
      setAuthToken(session.access_token);
      const rows = await refreshPeople(session.access_token);
      const rec = rows.find((p) => p.id === session.user.id);
      if (!rec) {
        throw new Error("Your account exists but has no profile on file. Please contact support.");
      }
      setCurrentUser(rec);
      setScreen("intro");
    } catch (err) {
      setAuthError(err.message || "Something went wrong signing in.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignup(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!signupForm.firstName || !signupForm.lastName || !signupForm.email || !signupForm.password) {
      setAuthError("Please complete all required fields.");
      return;
    }
    if (signupForm.password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    setAuthError("");
    setAuthLoading(true);
    try {
      // Signup deliberately asks for almost nothing beyond identity — role,
      // career info, schools, etc. all get filled in later via My Profile
      // (which already nudges people to complete it), rather than
      // front-loading a long form before someone's even seen the site.
      // "Alumni" is just a starting default; easy to correct afterward.
      // Everything else starts genuinely blank, not a guessed value — an
      // earlier version defaulted new signups to "Finance / Private
      // Equity" and "New York," which meant every barely-filled-out new
      // account looked like a real Private Equity match to search and
      // showed misleading info in the directory, purely because nobody
      // had actually said that yet.
      const newPersonData = {
        firstName: signupForm.firstName,
        lastName: signupForm.lastName,
        role: "Alumni",
        gradYear: null,
        children: [],
        email: signupForm.email,
        phone: "—",
        city: "",
        neighborhood: "",
        occupation: "",
        field: "",
        subfield: "",
        company: "",
        tier: "Friend",
        joined: new Date().getFullYear(),
        bio: "",
        visible: true,
      };
      const session = await supabaseSignUp(signupForm.email, signupForm.password);
      const newPerson = await insertProfile(session.access_token, session.user.id, newPersonData);
      setAuthToken(session.access_token);
      await refreshPeople(session.access_token);
      setCurrentUser(newPerson);
      setScreen("dashboard");
    } catch (err) {
      setAuthError(err.message || "Something went wrong creating your account.");
    } finally {
      setAuthLoading(false);
    }
  }

  function openProfile() {
    if (currentUser?.id) {
      const rec = people.find((p) => p.id === currentUser.id);
      const kids = (rec && rec.children) || [];
      setProfileForm({
        ...rec,
        childGradYear: kids[0]?.gradYear || "",
        hasSecondChild: kids.length > 1,
        child2GradYear: kids[1]?.gradYear || "",
      });
    } else {
      setProfileForm({
        firstName: currentUser?.firstName || "", lastName: currentUser?.lastName || "",
        role: "Alumni", gradYear: "", childGradYear: "",
        hasSecondChild: false, child2GradYear: "",
        email: currentUser?.email || "", phone: "", city: "", neighborhood: "",
        highSchool: "", college: "",
        occupation: "", field: "", subfield: "",
        company: "", tier: "Friend", bio: "", helpOffer: "", linkedin: "", instagram: "", twitter: "", visible: true, promoOptIn: false,
      });
    }
    setSavedNotice(false);
    setProfileError("");
    setConfirmDelete(false);
    setScreen("profile");
  }

  async function saveProfile(e) {
    if (e && e.preventDefault) e.preventDefault();
    setProfileError("");
    if (!profileForm.firstName?.trim() && !profileForm.lastName?.trim()) {
      setProfileError("Please enter at least a first or last name before saving.");
      return;
    }
    const wantsParentField = profileForm.role === "Parent" || profileForm.role === "Alumni & Parent";
    const existingRec = people.find((p) => p.id === profileForm.id);
    const existingKids = (existingRec && existingRec.children) || [];
    const children = [];
    if (wantsParentField) {
      children.push({
        name: existingKids[0]?.name || "—",
        gradYear: Number(profileForm.childGradYear) || 2015 + Math.floor(Math.random() * 20),
      });
      if (profileForm.hasSecondChild) {
        children.push({
          name: existingKids[1]?.name || "—",
          gradYear: Number(profileForm.child2GradYear) || 2015 + Math.floor(Math.random() * 20),
        });
      }
    }
    const finalProfile = { ...profileForm, children };
    try {
      const saved = await updateProfileRow(authToken, currentUser.id, finalProfile);
      await refreshPeople();
      setCurrentUser(saved);
      setProfileForm(saved);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch (err) {
      setProfileError(err.message || "Something went wrong saving your profile.");
    }
  }

  // Self-service deletion: lets someone remove their own record entirely.
  async function handleDeleteProfile() {
    if (!profileForm?.id) return;
    try {
      await deleteProfileRow(authToken, profileForm.id);
    } catch (err) {
      setProfileError(err.message || "Something went wrong deleting your record.");
      return;
    }
    setCurrentUser(null);
    setAuthToken(null);
    setPeople([]);
    setScreen("landing");
    setLoginForm({ email: "", password: "" });
  }

  function handleAiSearch() {
    const q = aiQuery.trim();
    if (!q) return;
    const matches = searchMembers(q, people, currentUser?.id);
    setAiHistory((h) => [...h, { query: q, matches }]);
    setAiQuery("");
  }

  // Matches if any whole word in the text starts with the query — e.g.
  // "vivi" matches "Vivienne" but not a buried substring like "Vivid" in
  // the middle of an unrelated company name. Much more predictable than a
  // plain .includes() anywhere-in-the-string match.
  function wordStartsWith(text, q) {
    if (!text || !q) return false;
    return text
      .toLowerCase()
      .split(/[\s,.\-–—]+/)
      .some((word) => word.startsWith(q));
  }

  const filtered = useMemo(() => {
    return people
      .filter((p) => {
        if (p.visible === false) return false;
        const matchesRole = roleFilter === "All" || p.role === roleFilter;
        const matchesField = fieldFilter === "All" || p.field === fieldFilter;
        const matchesSubfield = subfieldFilter === "All" || p.subfield === subfieldFilter;
        const q = query.trim().toLowerCase();
        const matchesQuery =
          !q ||
          wordStartsWith(`${p.firstName} ${p.lastName}`, q) ||
          wordStartsWith(p.occupation, q) ||
          wordStartsWith(p.company, q) ||
          wordStartsWith(p.neighborhood, q) ||
          String(p.gradYear || "").startsWith(q);
        return matchesRole && matchesField && matchesSubfield && matchesQuery;
      })
      .sort((a, b) => {
        const lastCompare = a.lastName.localeCompare(b.lastName);
        return lastCompare !== 0 ? lastCompare : a.firstName.localeCompare(b.firstName);
      });
  }, [people, query, roleFilter, fieldFilter, subfieldFilter]);

  const stats = useMemo(() => {
    const alumni = people.filter((p) => p.role.includes("Alumni")).length;
    const parents = people.filter((p) => p.role.includes("Parent")).length;
    const classYears = new Set(people.map((p) => p.gradYear).filter(Boolean));
    return { total: people.length, alumni, parents, classes: classYears.size };
  }, [people]);

  // Grouped for the "Alumni" tab: every graduate, bucketed by class year, most recent first.
  const alumniByYear = useMemo(() => {
    const groups = {};
    people
      .filter((p) => p.visible !== false && p.role.includes("Alumni") && p.gradYear)
      .forEach((p) => {
        if (!groups[p.gradYear]) groups[p.gradYear] = [];
        groups[p.gradYear].push(p);
      });
    Object.keys(groups).forEach((y) => {
      groups[y].sort((a, b) => {
        const lastCompare = a.lastName.localeCompare(b.lastName);
        return lastCompare !== 0 ? lastCompare : a.firstName.localeCompare(b.firstName);
      });
    });
    return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [people]);

  // Grouped for the "Parents of Alumni" tab: one entry per graduated child
  // (not per parent), bucketed by class year, most recent first — so a
  // parent with two sons who graduated in different years shows up under
  // both, correctly attributed to the right son each time. "Graduated"
  // simply means the year has already happened.
  const parentsOfAlumniByYear = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const groups = {};
    people
      .filter((p) => p.visible !== false && p.role.includes("Parent"))
      .forEach((p) => {
        (p.children || []).forEach((child) => {
          if (child.gradYear && child.gradYear <= currentYear) {
            if (!groups[child.gradYear]) groups[child.gradYear] = [];
            groups[child.gradYear].push({ parent: p, child });
          }
        });
      });
    Object.keys(groups).forEach((y) => {
      groups[y].sort((a, b) => (a.child.name || "").localeCompare(b.child.name || ""));
    });
    return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [people]);

  // Grouped for the "HS Matriculation" tab: Buckley alumni only, bucketed
  // by the high school they attended after Buckley, alphabetically.
  const hsMatriculation = useMemo(() => {
    const groups = {};
    people
      .filter((p) => p.visible !== false && p.role.includes("Alumni") && p.highSchool)
      .forEach((p) => {
        if (!groups[p.highSchool]) groups[p.highSchool] = [];
        groups[p.highSchool].push(p);
      });
    Object.keys(groups).forEach((s) => {
      groups[s].sort((a, b) => {
        const lastCompare = a.lastName.localeCompare(b.lastName);
        return lastCompare !== 0 ? lastCompare : a.firstName.localeCompare(b.firstName);
      });
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [people]);

  // Grouped for the "College Matriculation" tab: Buckley alumni only,
  // bucketed by college, alphabetically. Alumni without a college listed —
  // including anyone who hasn't finished high school yet — are excluded
  // entirely rather than showing up as an empty/placeholder entry.
  const collegeMatriculation = useMemo(() => {
    const groups = {};
    people
      .filter((p) => p.visible !== false && p.role.includes("Alumni") && p.college)
      .forEach((p) => {
        if (!groups[p.college]) groups[p.college] = [];
        groups[p.college].push(p);
      });
    Object.keys(groups).forEach((s) => {
      groups[s].sort((a, b) => {
        const lastCompare = a.lastName.localeCompare(b.lastName);
        return lastCompare !== 0 ? lastCompare : a.firstName.localeCompare(b.firstName);
      });
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [people]);

  // Powers the Community Map: every visible member grouped by city, with
  // coordinates resolved via CITY_COORDS. Cities we don't have coordinates
  // for yet are counted but simply don't get a pin (graceful, not broken).
  const membersByCity = useMemo(() => {
    const groups = {};
    people
      .filter((p) => p.visible !== false && p.city)
      .forEach((p) => {
        const key = Object.keys(CITY_COORDS).find((c) => c.toLowerCase() === p.city.trim().toLowerCase()) || p.city;
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      });
    return Object.entries(groups)
      .map(([city, members]) => ({
        city,
        members: [...members].sort((a, b) => {
          const lastCompare = a.lastName.localeCompare(b.lastName);
          return lastCompare !== 0 ? lastCompare : a.firstName.localeCompare(b.firstName);
        }),
        coords: CITY_COORDS[city] || null,
      }))
      .sort((a, b) => b.members.length - a.members.length);
  }, [people]);

  // Memoized separately from membersByCity's own re-derivation so these
  // keep a stable reference across renders that don't actually change the
  // underlying data (e.g. clicking a city). The 3D globe rebuilds its whole
  // scene — and resets its camera — whenever these props change identity,
  // so an unstable reference here previously caused the globe to reset
  // (appearing to "zoom all the way out") on every single click.
  const cityPoints = useMemo(() => membersByCity.filter((c) => c.coords), [membersByCity]);
  const maxCityCount = useMemo(() => Math.max(1, ...cityPoints.map((c) => c.members.length)), [cityPoints]);

  // How complete the signed-in member's own profile is, based on the
  // optional-but-valuable fields signup doesn't ask for. Used to power the
  // "complete your profile" nudge on the dashboard.
  const profileCompleteness = useMemo(() => {
    if (!currentUser?.id) return null;
    const rec = people.find((p) => p.id === currentUser.id);
    if (!rec) return null;
    const isBlank = (v) => !v || v === "—";
    const hasSocial = !!(rec.linkedin || rec.instagram || rec.twitter || (rec.otherSocialPlatform && rec.otherSocialHandle));
    const checks = [
      !isBlank(rec.occupation),
      !isBlank(rec.company),
      !isBlank(rec.city),
      !isBlank(rec.neighborhood),
      !isBlank(rec.highSchool),
      !isBlank(rec.college),
      !isBlank(rec.helpOffer),
      hasSocial,
    ];
    const done = checks.filter(Boolean).length;
    return { percent: Math.round((done / checks.length) * 100), done, total: checks.length };
  }, [people, currentUser]);

  const fontImports = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=IBM+Plex+Mono:wght@400;500&display=swap');
    `}</style>
  );

  // ---------- LOGIN ----------
  if (!dataLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: INK_DEEP }}>
        {fontImports}
        <div className="flex flex-col items-center gap-3">
          <Crest size={44} />
          <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: BRASS_LIGHT, letterSpacing: "0.12em" }}>LOADING REGISTRY…</div>
        </div>
      </div>
    );
  }

  // ---------- LANDING ----------
  if (screen === "landing") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: `linear-gradient(165deg, ${INK} 0%, ${INK_DEEP} 55%, ${ROYAL} 150%)` }}>
        {fontImports}
        <div className="w-full max-w-sm text-center">
          <div className="flex flex-col items-center mb-8">
            <Crest size={64} />
            <div className="mt-4">
              <div style={{ fontFamily: "Cormorant Garamond, serif", color: PARCHMENT, fontSize: 30, letterSpacing: "0.04em" }}>Harkness</div>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", color: BRASS_LIGHT, fontSize: 11, letterSpacing: "0.2em", marginTop: 4 }}>THE BUCKLEY ALUMNI &amp; FAMILY REGISTRY</div>
            </div>
          </div>

          <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: "#C7CBD6", marginBottom: 28, lineHeight: 1.5 }}>
            A place for Buckley alumni and parents to find each other — and help each other.
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => { setAuthError(""); setScreen("login"); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-sm transition-opacity hover:opacity-90"
              style={{ background: PARCHMENT, color: INK, fontFamily: "IBM Plex Mono, monospace", fontSize: 12, letterSpacing: "0.12em" }}
            >
              <LogIn size={14} /> LOG IN
            </button>
            <button
              type="button"
              onClick={() => { setAuthError(""); setScreen("signup"); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-sm transition-opacity hover:opacity-90"
              style={{ border: `1px solid ${BRASS}`, color: BRASS_LIGHT, fontFamily: "IBM Plex Mono, monospace", fontSize: 12, letterSpacing: "0.12em" }}
            >
              <UserPlus size={14} /> FIRST TIME HERE? CREATE YOUR ACCOUNT
            </button>
          </div>

          <div className="mt-8 text-center" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9, letterSpacing: "0.1em", color: ROYAL_LIGHT }}>
            NOT AN OFFICIAL BUCKLEY SCHOOL PLATFORM — A COMMUNITY PROJECT
          </div>
        </div>
      </div>
    );
  }

  // ---------- LOGIN ----------
  if (screen === "login") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: INK_DEEP }}>
        {fontImports}
        <div className="w-full max-w-sm">
          <button
            onClick={() => { setAuthError(""); setScreen("landing"); }}
            className="flex items-center gap-1.5 mb-5"
            style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: BRASS_LIGHT, letterSpacing: "0.08em" }}
          >
            <ArrowLeft size={13} /> BACK
          </button>
          <div className="flex flex-col items-center mb-8">
            <Crest size={56} />
            <div className="mt-4 text-center">
              <div style={{ fontFamily: "Cormorant Garamond, serif", color: PARCHMENT, fontSize: 26, letterSpacing: "0.04em" }}>Harkness</div>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", color: BRASS_LIGHT, fontSize: 11, letterSpacing: "0.2em", marginTop: 4 }}>THE BUCKLEY ALUMNI &amp; FAMILY REGISTRY</div>
            </div>
          </div>
          <div className="text-center mb-5" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9, letterSpacing: "0.1em", color: ROYAL_LIGHT }}>
            NOT AN OFFICIAL BUCKLEY SCHOOL PLATFORM — A COMMUNITY PROJECT
          </div>

          <div
            className="p-8 rounded-2xl"
            style={{ background: PARCHMENT, border: `1px solid ${BRASS}`, boxShadow: SOFT_SHADOW }}
          >
            <div className="mb-5">
              <label className="block mb-1.5" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.1em", color: SLATE }}>EMAIL</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-sm" style={{ background: "#fff", border: `1px solid ${PARCHMENT_DEEP}` }}>
                <Mail size={15} color={SLATE} />
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full outline-none bg-transparent"
                  style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: INK }}
                />
              </div>
            </div>
            <div className="mb-2">
              <label className="block mb-1.5" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.1em", color: SLATE }}>PASSWORD</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-sm" style={{ background: "#fff", border: `1px solid ${PARCHMENT_DEEP}` }}>
                <Lock size={15} color={SLATE} />
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full outline-none bg-transparent"
                  style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: INK }}
                />
              </div>
            </div>

            {authError && <div className="mb-3 text-sm" style={{ color: CRIMSON, fontFamily: "Source Serif 4, serif" }}>{authError}</div>}

            <button
              type="button"
              onClick={handleLogin}
              disabled={authLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-sm transition-opacity hover:opacity-90"
              style={{ background: INK, color: BRASS_LIGHT, fontFamily: "IBM Plex Mono, monospace", fontSize: 12, letterSpacing: "0.12em", opacity: authLoading ? 0.6 : 1 }}
            >
              <LogIn size={14} /> {authLoading ? "LOGGING IN…" : "LOG IN"}
            </button>

            <div className="mt-5 pt-5 text-center" style={{ borderTop: `1px solid ${PARCHMENT_DEEP}` }}>
              <span style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE }}>New to the registry? </span>
              <button
                type="button"
                onClick={() => { setAuthError(""); setScreen("signup"); }}
                style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: ROYAL, textDecoration: "underline" }}
              >
                Create your record
              </button>
            </div>
          </div>

          <div className="mt-5 text-center" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: SLATE, letterSpacing: "0.05em" }}>
            Real accounts · your information is only visible to signed-in members
          </div>
        </div>
      </div>
    );
  }

  // ---------- INTRO ANIMATION (plays once, right after sign-in) ----------
  if (screen === "intro") {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{
          background: INK_DEEP,
          opacity: introFadeOut ? 0 : 1,
          transition: "opacity 450ms ease",
        }}
      >
        {fontImports}
        <style>{`
          @keyframes crestIntroReveal {
            0% { opacity: 0; transform: scale(0.72); }
            65% { opacity: 1; transform: scale(1.06); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes crestIntroTextReveal {
            0% { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div className="flex flex-col items-center">
          <div style={{ animation: "crestIntroReveal 900ms cubic-bezier(0.22, 1, 0.36, 1) forwards" }}>
            <Crest size={92} />
          </div>
          <div
            className="mt-6 text-center"
            style={{ animation: "crestIntroTextReveal 700ms ease-out forwards", animationDelay: "500ms", opacity: 0 }}
          >
            <div style={{ fontFamily: "Cormorant Garamond, serif", color: PARCHMENT, fontSize: 32, letterSpacing: "0.05em" }}>Harkness</div>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", color: BRASS_LIGHT, fontSize: 11, letterSpacing: "0.24em", marginTop: 6 }}>
              THE BUCKLEY ALUMNI &amp; FAMILY REGISTRY
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- SIGNUP ----------
  if (screen === "signup") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: INK_DEEP }}>
        {fontImports}
        <div className="w-full max-w-md">
          <button
            onClick={() => { setAuthError(""); setScreen("landing"); }}
            className="flex items-center gap-1.5 mb-5"
            style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: BRASS_LIGHT, letterSpacing: "0.08em" }}
          >
            <ArrowLeft size={13} /> BACK
          </button>

          <div className="p-8 rounded-2xl" style={{ background: PARCHMENT, border: `1px solid ${BRASS}`, boxShadow: SOFT_SHADOW }}>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 24, color: INK, marginBottom: 2 }}>Join the Registry</div>
            <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE, marginBottom: 20 }}>
              Alumni and parents both welcome. Just the basics for now — you'll fill in the rest once you're in.
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="FIRST NAME">
                  <input value={signupForm.firstName} onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })} style={fldStyle} />
                </Field>
                <Field label="LAST NAME">
                  <input value={signupForm.lastName} onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })} style={fldStyle} />
                </Field>
              </div>
              <Field label="EMAIL">
                <input type="email" value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} style={fldStyle} />
              </Field>
              <Field label="PASSWORD">
                <input type="password" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} style={fldStyle} />
              </Field>

              {authError && <div className="text-sm" style={{ color: CRIMSON, fontFamily: "Source Serif 4, serif" }}>{authError}</div>}

              <button
                type="button"
                onClick={handleSignup}
                disabled={authLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-sm transition-opacity hover:opacity-90"
                style={{ background: INK, color: BRASS_LIGHT, fontFamily: "IBM Plex Mono, monospace", fontSize: 12, letterSpacing: "0.12em", opacity: authLoading ? 0.6 : 1 }}
              >
                <UserPlus size={14} /> {authLoading ? "CREATING YOUR RECORD…" : "CREATE RECORD & ENTER"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- PROFILE ----------
  if (screen === "profile" && profileForm) {
    const subOptions = CAREER_FIELDS[profileForm.field] || [];
    return (
      <div className="min-h-screen w-full" style={{ background: PARCHMENT }}>
        {fontImports}
        <div style={{ background: INK_DEEP, borderBottom: `1px solid ${BRASS}` }}>
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={() => setScreen("dashboard")} className="flex items-center gap-1.5" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: BRASS_LIGHT, letterSpacing: "0.08em" }}>
              <ArrowLeft size={13} /> BACK TO DIRECTORY
            </button>
            <div className="flex items-center gap-2">
              <Crest size={26} />
              <span style={{ fontFamily: "Cormorant Garamond, serif", color: PARCHMENT, fontSize: 16 }}>My Public Profile</span>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8">
          <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE, marginBottom: 20 }}>
            This information appears in the directory that other alumni and parents can search. Fields marked optional can be left blank.
          </div>

          <div className="p-8 rounded-2xl space-y-4" style={{ background: "#fff", border: `1px solid ${PARCHMENT_DEEP}`, boxShadow: SOFT_SHADOW }}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="FIRST NAME"><input value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} style={fldStyle} /></Field>
              <Field label="LAST NAME"><input value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} style={fldStyle} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="EMAIL"><input value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} style={fldStyle} /></Field>
              <Field label="PHONE (OPTIONAL)"><input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} style={fldStyle} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="ROLE">
                {profileForm.roleIsCustom ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={profileForm.role || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                      placeholder="Type your role"
                      style={fldStyle}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setProfileForm({ ...profileForm, roleIsCustom: false, role: "Alumni" })}
                      style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: ROYAL, whiteSpace: "nowrap" }}
                    >
                      LIST
                    </button>
                  </div>
                ) : (
                  <select
                    value={profileForm.role}
                    onChange={(e) => {
                      if (e.target.value === "") setProfileForm({ ...profileForm, roleIsCustom: true, role: "" });
                      else setProfileForm({ ...profileForm, role: e.target.value });
                    }}
                    style={fldStyle}
                  >
                    <option value="">— Type my own / reset —</option>
                    <option>Alumni</option><option>Parent</option><option>Alumni & Parent</option>
                  </select>
                )}
              </Field>
              {(profileForm.role === "Alumni" || profileForm.role === "Alumni & Parent") && (
                <Field label="GRADUATION YEAR">
                  <YearSelect
                    value={profileForm.gradYear}
                    onChange={(v) => setProfileForm({ ...profileForm, gradYear: v })}
                    isCustom={profileForm.gradYearIsCustom}
                    onToggleCustom={(c) => setProfileForm({ ...profileForm, gradYearIsCustom: c })}
                    placeholder="Type your graduation year"
                  />
                </Field>
              )}
              {(profileForm.role === "Parent" || profileForm.role === "Alumni & Parent") && (
                <Field label="SON'S GRADUATION YEAR (ACTUAL OR EXPECTED)">
                  <YearSelect
                    value={profileForm.childGradYear}
                    onChange={(v) => setProfileForm({ ...profileForm, childGradYear: v })}
                    isCustom={profileForm.childGradYearIsCustom}
                    onToggleCustom={(c) => setProfileForm({ ...profileForm, childGradYearIsCustom: c })}
                    placeholder="Type a year"
                  />
                </Field>
              )}
            </div>
            {(profileForm.role === "Parent" || profileForm.role === "Alumni & Parent") && (
              <>
                <label className="flex items-center gap-2" style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE }}>
                  <input
                    type="checkbox"
                    checked={profileForm.hasSecondChild || false}
                    onChange={(e) => setProfileForm({ ...profileForm, hasSecondChild: e.target.checked })}
                  />
                  I have a second son who attends or attended Buckley
                </label>
                {profileForm.hasSecondChild && (
                  <Field label="SECOND SON'S GRADUATION YEAR (ACTUAL OR EXPECTED)">
                    <YearSelect
                      value={profileForm.child2GradYear}
                      onChange={(v) => setProfileForm({ ...profileForm, child2GradYear: v })}
                      isCustom={profileForm.child2GradYearIsCustom}
                      onToggleCustom={(c) => setProfileForm({ ...profileForm, child2GradYearIsCustom: c })}
                      placeholder="Type a year"
                    />
                  </Field>
                )}
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="HIGH SCHOOL">
                <AutocompleteInput
                  value={profileForm.highSchool}
                  onChange={(v) => setProfileForm({ ...profileForm, highSchool: v })}
                  options={HIGH_SCHOOLS}
                  placeholder="Start typing a high school..."
                />
              </Field>
              <Field label="COLLEGE">
                <AutocompleteInput
                  value={profileForm.college}
                  onChange={(v) => setProfileForm({ ...profileForm, college: v })}
                  options={UNIVERSITIES}
                  placeholder="Start typing a university..."
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="CAREER FIELD">
                {profileForm.fieldIsCustom ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={profileForm.field || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, field: e.target.value })}
                      placeholder="Type your field"
                      style={fldStyle}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setProfileForm({ ...profileForm, fieldIsCustom: false, subfieldIsCustom: false, field: FIELD_NAMES[0], subfield: CAREER_FIELDS[FIELD_NAMES[0]][0] })}
                      style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: ROYAL, whiteSpace: "nowrap" }}
                    >
                      LIST
                    </button>
                  </div>
                ) : (
                  <select
                    value={profileForm.field}
                    onChange={(e) => {
                      if (e.target.value === "") {
                        setProfileForm({ ...profileForm, fieldIsCustom: true, field: "" });
                      } else {
                        setProfileForm({ ...profileForm, field: e.target.value, subfield: CAREER_FIELDS[e.target.value][0] });
                      }
                    }}
                    style={fldStyle}
                  >
                    <option value="">— Type my own / reset —</option>
                    {FIELD_NAMES.map((f) => <option key={f}>{f}</option>)}
                  </select>
                )}
              </Field>
              <Field label="SPECIALTY">
                {profileForm.subfieldIsCustom ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={profileForm.subfield || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, subfield: e.target.value })}
                      placeholder="Type your specialty"
                      style={fldStyle}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setProfileForm({ ...profileForm, subfieldIsCustom: false, subfield: (CAREER_FIELDS[profileForm.field] || subOptions)[0] || "" })}
                      style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: ROYAL, whiteSpace: "nowrap" }}
                    >
                      LIST
                    </button>
                  </div>
                ) : (
                  <select
                    value={profileForm.subfield}
                    onChange={(e) => {
                      if (e.target.value === "") {
                        setProfileForm({ ...profileForm, subfieldIsCustom: true, subfield: "" });
                      } else {
                        setProfileForm({ ...profileForm, subfield: e.target.value });
                      }
                    }}
                    style={fldStyle}
                  >
                    <option value="">— Type my own / reset —</option>
                    {subOptions.map((s) => <option key={s}>{s}</option>)}
                  </select>
                )}
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="TITLE"><input value={profileForm.occupation} onChange={(e) => setProfileForm({ ...profileForm, occupation: e.target.value })} style={fldStyle} /></Field>
              <Field label="EMPLOYER"><input value={profileForm.company} onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })} style={fldStyle} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="CITY">
                <AutocompleteInput
                  value={profileForm.city}
                  onChange={(v) => setProfileForm({ ...profileForm, city: v })}
                  options={CITIES}
                  placeholder="e.g. New York"
                />
              </Field>
              <Field label="NEIGHBORHOOD">
                <AutocompleteInput
                  value={profileForm.neighborhood}
                  onChange={(v) => setProfileForm({ ...profileForm, neighborhood: v })}
                  options={neighborhoodsForCity(profileForm.city)}
                  placeholder={
                    neighborhoodsForCity(profileForm.city).length
                      ? `e.g. ${neighborhoodsForCity(profileForm.city)[0]}`
                      : "Enter a city above for suggestions"
                  }
                />
              </Field>
            </div>
            <div>
              <label className="flex items-center gap-1.5 mb-1.5" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.1em", color: SLATE }}>
                <HeartHandshake size={13} /> HOW YOU WISH TO HELP OTHER ALUMS / PARENTS
              </label>
              <textarea
                value={profileForm.helpOffer || ""}
                onChange={(e) => setProfileForm({ ...profileForm, helpOffer: e.target.value })}
                rows={3}
                placeholder="e.g. career mentorship, industry introductions, college advice, hosting events in my city..."
                style={{ ...fldStyle, resize: "none" }}
              />
            </div>

            <div>
              <label className="block mb-2" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.1em", color: SLATE }}>
                SOCIAL MEDIA (OPTIONAL)
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ width: 38, height: 38, borderRadius: 4, background: "#0A66C2" }}
                  >
                    <Linkedin size={18} color="#fff" />
                  </div>
                  <input
                    value={profileForm.linkedin || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, linkedin: e.target.value })}
                    placeholder="LinkedIn username or profile URL"
                    style={fldStyle}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ width: 38, height: 38, borderRadius: 4, background: "linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)" }}
                  >
                    <Instagram size={18} color="#fff" />
                  </div>
                  <input
                    value={profileForm.instagram || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, instagram: e.target.value })}
                    placeholder="Instagram @handle"
                    style={fldStyle}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ width: 38, height: 38, borderRadius: 4, background: INK }}
                  >
                    <Twitter size={18} color="#fff" />
                  </div>
                  <input
                    value={profileForm.twitter || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, twitter: e.target.value })}
                    placeholder="X (Twitter) @handle"
                    style={fldStyle}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ width: 38, height: 38, borderRadius: 4, background: BRASS }}
                  >
                    <Link2 size={18} color="#fff" />
                  </div>
                  <select
                    value={profileForm.otherSocialPlatform || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, otherSocialPlatform: e.target.value })}
                    style={{ ...fldStyle, flex: "0 0 132px" }}
                  >
                    <option value="">Other...</option>
                    {OTHER_SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input
                    value={profileForm.otherSocialHandle || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, otherSocialHandle: e.target.value })}
                    placeholder="Username or profile URL"
                    style={fldStyle}
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1" style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE }}>
              <input type="checkbox" checked={profileForm.visible} onChange={(e) => setProfileForm({ ...profileForm, visible: e.target.checked })} />
              Show my profile in the directory
            </label>

            <div className="flex items-center justify-between gap-4 pt-2" style={{ borderTop: `1px solid ${PARCHMENT_DEEP}`, marginTop: 4, paddingTop: 16 }}>
              <div>
                <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: INK }}>
                  Receive promotional material from other Buckley community members
                </div>
                <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 12, color: SLATE, marginTop: 2 }}>
                  This is content sent to 20 or more people at once by a fellow alum or parent — not messages from the school itself.
                </div>
              </div>
              <ToggleSwitch
                checked={!!profileForm.promoOptIn}
                onChange={(v) => setProfileForm({ ...profileForm, promoOptIn: v })}
              />
            </div>

            {profileError && (
              <div style={{ color: CRIMSON, fontFamily: "Source Serif 4, serif", fontSize: 13 }}>{profileError}</div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={saveProfile}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-sm transition-opacity hover:opacity-90"
                style={{ background: INK, color: BRASS_LIGHT, fontFamily: "IBM Plex Mono, monospace", fontSize: 12, letterSpacing: "0.12em" }}
              >
                <Save size={14} /> SAVE PROFILE
              </button>
              {savedNotice && (
                <span className="flex items-center gap-1.5" style={{ color: ROYAL, fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>
                  <Check size={14} /> SAVED
                </span>
              )}
            </div>

            {profileForm.id && (
              <div className="pt-4 mt-4" style={{ borderTop: `1px solid ${PARCHMENT_DEEP}` }}>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.06em", color: SLATE }}
                  >
                    DELETE MY RECORD
                  </button>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: CRIMSON }}>
                      Permanently remove your record from the directory? This can't be undone.
                    </span>
                    <button
                      type="button"
                      onClick={handleDeleteProfile}
                      className="px-3 py-1.5 rounded-sm flex-shrink-0"
                      style={{ background: CRIMSON, color: "#fff", fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.06em" }}
                    >
                      YES, DELETE
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 rounded-sm flex-shrink-0"
                      style={{ border: `1px solid ${PARCHMENT_DEEP}`, color: SLATE, fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.06em" }}
                    >
                      CANCEL
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- DASHBOARD ----------
  const subfieldOptions = fieldFilter !== "All" ? CAREER_FIELDS[fieldFilter] : [];

  return (
    <div className="min-h-screen w-full" style={{ background: PARCHMENT }}>
      {fontImports}
      {/* Header */}
      <div style={{ background: INK_DEEP, borderBottom: `1px solid ${BRASS}`, boxShadow: `0 2px 0 ${ROYAL}` }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setDashboardTab("directory")}
            className="flex items-center gap-3"
            style={{ cursor: "pointer" }}
            title="Back to home"
          >
            <Crest size={34} />
            <div className="text-left">
              <div style={{ fontFamily: "Cormorant Garamond, serif", color: PARCHMENT, fontSize: 19, letterSpacing: "0.03em" }}>Harkness</div>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", color: BRASS_LIGHT, fontSize: 9, letterSpacing: "0.18em" }}>THE BUCKLEY ALUMNI &amp; FAMILY REGISTRY</div>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={openProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm"
              style={{ border: `1px solid ${BRASS}`, color: BRASS_LIGHT, fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em" }}
            >
              <UserCircle size={13} /> MY PROFILE
            </button>
            <div className="text-right hidden sm:block">
              <div style={{ fontFamily: "Source Serif 4, serif", color: PARCHMENT, fontSize: 13 }}>{currentUser?.firstName} {currentUser?.lastName}</div>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", color: BRASS_LIGHT, fontSize: 10 }}>{currentUser?.email}</div>
            </div>
            <button
              onClick={() => { setScreen("landing"); setCurrentUser(null); setAuthToken(null); setPeople([]); setLoginForm({ email: "", password: "" }); }}
              className="px-3 py-1.5 rounded-sm"
              style={{ border: `1px solid ${BRASS}`, color: BRASS_LIGHT, fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em" }}
            >
              SIGN OUT
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-6">
          <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 28, color: INK }}>Welcome, {currentUser?.firstName}.</div>
          <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: SLATE }}>
            Your record is in the directory below. Head to <button onClick={openProfile} style={{ color: ROYAL, textDecoration: "underline" }}>My Profile</button> to add details others can see.
          </div>
        </div>

        {/* Complete your profile nudge */}
        {profileCompleteness && profileCompleteness.percent < 100 && (
          <div
            className="flex items-center gap-4 rounded-xl mb-6 px-5 py-4"
            style={{ background: "#fff", border: `1px solid ${PARCHMENT_DEEP}`, borderLeft: `3px solid ${ROYAL}`, boxShadow: SOFT_SHADOW }}
          >
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 16, color: INK }}>
                  Your profile is {profileCompleteness.percent}% complete
                </span>
                <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.06em", color: SLATE }}>
                  {profileCompleteness.done} OF {profileCompleteness.total}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: PARCHMENT_DEEP, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${profileCompleteness.percent}%`,
                    background: ROYAL,
                    borderRadius: 3,
                    transition: "width 400ms ease",
                  }}
                />
              </div>
              <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 12, color: SLATE, marginTop: 6 }}>
                Add your occupation, schools, and how you can help fellow alumni & parents — it only appears in the directory once you fill it in.
              </div>
            </div>
            <button
              onClick={openProfile}
              className="flex-shrink-0 px-4 py-2.5 rounded-sm transition-opacity hover:opacity-90"
              style={{ background: ROYAL, color: "#fff", fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em", whiteSpace: "nowrap" }}
            >
              COMPLETE MY PROFILE
            </button>
          </div>
        )}

        {/* Mission */}
        <div
          className="relative overflow-hidden rounded-2xl mb-8 px-8 py-9 text-center"
          style={{
            background: `linear-gradient(165deg, ${INK} 0%, ${INK_DEEP} 55%, ${ROYAL} 145%)`,
            border: `1px solid ${BRASS}`,
            boxShadow: SOFT_SHADOW,
          }}
        >
          <div className="flex justify-center mb-4">
            <Crest size={30} />
          </div>
          <div
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontStyle: "italic",
              fontSize: 21,
              lineHeight: 1.55,
              color: PARCHMENT,
              maxWidth: 720,
              margin: "0 auto",
            }}
          >
            "The goals of a Buckley education are that every boy learn fundamental skills, gain self-confidence through disciplined thought and action, develop personal integrity and respect for others, and discover the joy of learning and the satisfaction of pursuing excellence."
          </div>
          <div
            className="mt-5"
            style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.24em", color: BRASS_LIGHT }}
          >
            THE MISSION OF BUCKLEY — CARRIED FORWARD BY EVERY CLASS
          </div>
          <div
            className="mt-4"
            style={{
              fontFamily: "Source Serif 4, serif",
              fontStyle: "italic",
              fontSize: 11.5,
              lineHeight: 1.6,
              color: "#9AA3AE",
              maxWidth: 620,
              margin: "16px auto 0",
            }}
          >
            Named for the Harkness table — where, at some point in a Buckley boy's career, he will sit for a values class with Mr. O'Melia, pushed to apply what he has learned in the classroom to some of the world's most pressing questions of values, ethics, and morality.
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <a
              href="https://www.buckleyschool.org/support-buckley/give-today"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-sm transition-opacity hover:opacity-90"
              style={{ background: ROYAL, color: "#fff", fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em" }}
            >
              <Heart size={12} /> SUPPORT BUCKLEY
            </a>
            <a
              href="https://www.buckleyschool.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-sm transition-opacity hover:opacity-90"
              style={{ border: `1px solid ${BRASS}`, color: BRASS_LIGHT, fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em" }}
            >
              <ExternalLink size={12} /> VISIT BUCKLEYSCHOOL.ORG
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users size={16} />} label="Total Members" value={stats.total} />
          <StatCard icon={<GraduationCap size={16} />} label="Alumni" value={stats.alumni} />
          <StatCard icon={<Shield size={16} />} label="Parents" value={stats.parents} />
          <StatCard icon={<GraduationCap size={16} />} label="Classes Represented" value={stats.classes} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 flex-wrap" style={{ borderBottom: `1px solid ${PARCHMENT_DEEP}` }}>
          {[
            { key: "directory", label: "Directory", icon: <Search size={13} /> },
            { key: "classyear", label: "Class Year", icon: <GraduationCap size={13} /> },
            { key: "matriculation", label: "Matriculation", icon: <GraduationCap size={13} /> },
            { key: "map", label: "Community Map", icon: <MapPin size={13} /> },
            { key: "aisearch", label: "Optimus.AI", icon: <Sparkles size={13} /> },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setDashboardTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2.5"
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: dashboardTab === t.key ? ROYAL : SLATE,
                borderBottom: `2px solid ${dashboardTab === t.key ? ROYAL : "transparent"}`,
                marginBottom: -1,
              }}
            >
              {t.icon} {t.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        {dashboardTab === "directory" && (
        <>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-sm mb-3" style={{ background: "#fff", border: `1px solid ${PARCHMENT_DEEP}` }}>
          <Search size={15} color={SLATE} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, class year, occupation, employer, or neighborhood..."
            className="w-full outline-none bg-transparent"
            style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: INK }}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex gap-2 flex-wrap">
            {["All", "Alumni", "Parent", "Alumni & Parent"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className="px-4 py-2 rounded-sm"
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  whiteSpace: "nowrap",
                  background: roleFilter === r ? ROYAL : "#fff",
                  color: roleFilter === r ? "#fff" : SLATE,
                  border: `1px solid ${roleFilter === r ? ROYAL : PARCHMENT_DEEP}`,
                }}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex-1 flex gap-3">
            <select
              value={fieldFilter}
              onChange={(e) => { setFieldFilter(e.target.value); setSubfieldFilter("All"); }}
              className="flex-1"
              style={{ ...fldStyle, fontFamily: "IBM Plex Mono, monospace", fontSize: 12, padding: "8px 10px", border: `1px solid ${fieldFilter !== "All" ? ROYAL : PARCHMENT_DEEP}`, color: fieldFilter !== "All" ? ROYAL : INK }}
            >
              <option value="All">Career Field</option>
              {FIELD_NAMES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            {fieldFilter !== "All" && (
              <select
                value={subfieldFilter}
                onChange={(e) => setSubfieldFilter(e.target.value)}
                className="flex-1"
                style={{ ...fldStyle, fontFamily: "IBM Plex Mono, monospace", fontSize: 12, padding: "8px 10px", border: `1px solid ${subfieldFilter !== "All" ? ROYAL : PARCHMENT_DEEP}`, color: subfieldFilter !== "All" ? ROYAL : INK }}
              >
                <option value="All">All {fieldFilter} Specialties</option>
                {subfieldOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
        </div>

        <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: SLATE, marginBottom: 10 }}>
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </div>

        {/* Table */}
        {(() => {
          const showGradYear = roleFilter !== "Parent";
          const showKidGrade = roleFilter !== "Alumni";
          const cols = ["2fr", "1fr", "1.3fr"];
          if (showGradYear) cols.push("1.15fr");
          if (showKidGrade) cols.push("1.3fr");
          cols.push("1.5fr", "1.5fr", "1.4fr", "1.4fr", "1.4fr");
          const gridCols = cols.join(" ");
          const gridGap = "0 20px";
          return (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${PARCHMENT_DEEP}`, background: "#fff", overflowX: "auto", boxShadow: SOFT_SHADOW }}>
          <div className="hidden md:grid items-end" style={{ gridTemplateColumns: gridCols, gap: gridGap, padding: "10px 16px", background: PARCHMENT_DEEP, fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em", color: SLATE, minWidth: 1450 }}>
            <div>NAME</div><div>ROLE</div><div>LOCATION</div>
            {showGradYear && <div>GRADUATION<br />YEAR</div>}
            {showKidGrade && (
              <div style={{ lineHeight: 1.5 }}>
                SON'S GRADUATION<br />YEAR
              </div>
            )}
            <div>HIGH SCHOOL</div><div>COLLEGE</div>
            <div>FIELD / SPECIALTY</div><div>OCCUPATION</div><div>EMPLOYER</div>
          </div>
          {filtered.slice(0, 60).map((p) => (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              className="grid grid-cols-1 md:grid-cols-10 items-center gap-2 cursor-pointer hover:opacity-90"
              style={{ padding: "12px 16px", borderTop: `1px solid ${PARCHMENT_DEEP}`, gridTemplateColumns: gridCols, columnGap: 20, minWidth: 1450 }}
            >
              <div className="flex items-center gap-3">
                <Initials first={p.firstName} last={p.lastName} />
                <div>
                  <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: INK }}>{p.firstName} {p.lastName}</div>
                  <div className="md:hidden" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: SLATE }}>{p.role}</div>
                </div>
              </div>
              <div className="hidden md:block" style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE }}>{p.role}</div>
              <div className="hidden md:flex items-center gap-1" style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE }}>
                <MapPin size={11} /> {formatLocation(p) || "—"}
              </div>
              {showGradYear && (
                <div className="hidden md:block" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: SLATE }}>{p.gradYear || "—"}</div>
              )}
              {showKidGrade && (
                <div className="hidden md:block" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: SLATE }}>{formatChildrenSummary(p) || "—"}</div>
              )}
              <div className="hidden md:block" style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE }}>{p.highSchool || "—"}</div>
              <div className="hidden md:block" style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE }}>{p.college || "—"}</div>
              <div className="hidden md:block" style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE }}>
                {p.field ? `${p.field}${p.subfield ? " · " + p.subfield : ""}` : "—"}
              </div>
              <div className="hidden md:flex items-center gap-1" style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE }}>
                <Briefcase size={11} /> {p.occupation}
              </div>
              <div className="hidden md:block" style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE }}>{p.company || "—"}</div>
            </div>
          ))}
        </div>
          );
        })()}
        {filtered.length > 60 && (
          <div className="text-center py-3" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: SLATE }}>
            Showing first 60 of {filtered.length} results — refine your search to narrow further.
          </div>
        )}
        </>
        )}

        {/* Parents of Alumni */}
        {/* By Class Year (Alumni / Parents of Alumni, toggled) */}
        {dashboardTab === "classyear" && (
          <div>
            <div className="flex gap-2 mb-5">
              {[
                { key: "alumni", label: "Alumni" },
                { key: "parents", label: "Parents of Alumni" },
              ].map((v) => (
                <button
                  key={v.key}
                  onClick={() => setClassYearView(v.key)}
                  className="px-4 py-2 rounded-sm"
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    background: classYearView === v.key ? ROYAL : "#fff",
                    color: classYearView === v.key ? "#fff" : SLATE,
                    border: `1px solid ${classYearView === v.key ? ROYAL : PARCHMENT_DEEP}`,
                  }}
                >
                  {v.label.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-sm mb-5" style={{ background: "#fff", border: `1px solid ${PARCHMENT_DEEP}` }}>
              <Search size={15} color={SLATE} />
              <input
                value={classYearSearch}
                onChange={(e) => setClassYearSearch(e.target.value)}
                placeholder="Search by class year, e.g. 2015..."
                className="w-full outline-none bg-transparent"
                style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: INK }}
              />
            </div>

            {classYearView === "alumni" ? (
              <div className="space-y-6">
                {(() => {
                  const q = classYearSearch.trim();
                  const shown = q ? alumniByYear.filter(([year]) => String(year).includes(q)) : alumniByYear;
                  if (shown.length === 0) {
                    return (
                      <div className="text-center py-10" style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: SLATE }}>
                        {alumniByYear.length === 0 ? "No alumni records to display yet." : "No class years match that search."}
                      </div>
                    );
                  }
                  return shown.map(([year, grads]) => (
                    <div key={year} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${PARCHMENT_DEEP}`, background: "#fff", boxShadow: SOFT_SHADOW }}>
                      <div className="flex items-center justify-between px-5 py-3" style={{ background: INK }}>
                        <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 18, color: PARCHMENT }}>Class of {year}</span>
                        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em", color: BRASS_LIGHT }}>
                          {grads.length} {grads.length === 1 ? "ALUM" : "ALUMNI"}
                        </span>
                      </div>
                      {grads.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelected(p)}
                          className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:opacity-90"
                          style={{ borderTop: `1px solid ${PARCHMENT_DEEP}` }}
                        >
                          <Initials first={p.firstName} last={p.lastName} />
                          <div className="flex-1">
                            <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: INK }}>{p.firstName} {p.lastName}</div>
                            <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 12, color: SLATE }}>{p.occupation}</div>
                          </div>
                          <ChevronRight size={15} color={BRASS} />
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const q = classYearSearch.trim();
                  const shown = q ? parentsOfAlumniByYear.filter(([year]) => String(year).includes(q)) : parentsOfAlumniByYear;
                  if (shown.length === 0) {
                    return (
                      <div className="text-center py-10" style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: SLATE }}>
                        {parentsOfAlumniByYear.length === 0 ? "No parents of alumni to display yet." : "No class years match that search."}
                      </div>
                    );
                  }
                  return shown.map(([year, entries]) => (
                    <div key={year} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${PARCHMENT_DEEP}`, background: "#fff", boxShadow: SOFT_SHADOW }}>
                      <div className="flex items-center justify-between px-5 py-3" style={{ background: INK }}>
                        <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 18, color: PARCHMENT }}>Son's Class of {year}</span>
                        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em", color: BRASS_LIGHT }}>
                          {entries.length} {entries.length === 1 ? "FAMILY" : "FAMILIES"}
                        </span>
                      </div>
                      {entries.map(({ parent: p, child }, idx) => (
                        <div
                          key={`${p.id}-${idx}`}
                          onClick={() => setSelected(p)}
                          className="flex items-center justify-between px-5 py-3 cursor-pointer hover:opacity-90"
                          style={{ borderTop: `1px solid ${PARCHMENT_DEEP}` }}
                        >
                          <div className="flex items-center gap-3">
                            <Initials first={p.firstName} last={p.lastName} />
                            <div>
                              <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: INK }}>{p.firstName} {p.lastName}</div>
                              <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: SLATE }}>
                                Son: {child.name}
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={15} color={BRASS} />
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

        {/* Community Map */}
        {dashboardTab === "map" && (() => {
          const countries = new Set(
            cityPoints.map((c) => (["Dubai","Hong Kong","London","Paris","Singapore","Tokyo","Toronto"].includes(c.city) ? c.city : "United States"))
          );
          const activeCity = selectedCity ? membersByCity.find((c) => c.city === selectedCity) : null;

          return (
            <div>
              <div className="mb-5 text-center">
                <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 24, color: INK }}>Buckley Around the World</div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: SLATE, letterSpacing: "0.05em", marginTop: 4 }}>
                  {people.filter((p) => p.visible !== false).length} MEMBERS · {cityPoints.length} CITIES · {countries.size} {countries.size === 1 ? "COUNTRY" : "COUNTRIES"}
                </div>
              </div>

              <div className="max-w-sm mx-auto mb-6">
                <AutocompleteInput
                  value={selectedCity}
                  onChange={(v) => setSelectedCity(v || null)}
                  options={membersByCity.map((c) => c.city)}
                  placeholder="Search for a city..."
                />
              </div>

              <div className="rounded-xl overflow-hidden mb-6" style={{ border: `1px solid ${BRASS}`, background: INK_DEEP, boxShadow: SOFT_SHADOW }}>
                <Globe3D
                  cityPoints={cityPoints}
                  maxCount={maxCityCount}
                  selectedCity={selectedCity}
                  onSelectCity={(city) => setSelectedCity(city)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* City ranking — also works as a click target, since pins can be small */}
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${PARCHMENT_DEEP}`, background: "#fff", boxShadow: SOFT_SHADOW }}>
                  <div className="px-5 py-3" style={{ background: INK }}>
                    <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 16, color: PARCHMENT }}>Cities, by Buckley Presence</span>
                  </div>
                  {[...membersByCity]
                    .sort((a, b) => {
                      if (a.city === selectedCity) return -1;
                      if (b.city === selectedCity) return 1;
                      return 0;
                    })
                    .map((c) => (
                    <div
                      key={c.city}
                      onClick={() => setSelectedCity(c.city)}
                      className="flex items-center justify-between px-5 py-2.5 cursor-pointer hover:opacity-90"
                      style={{ borderTop: `1px solid ${PARCHMENT_DEEP}`, background: selectedCity === c.city ? PARCHMENT : "#fff" }}
                    >
                      <span style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: INK }}>
                        {c.city}{!c.coords && <span style={{ color: SLATE, fontStyle: "italic" }}> (no pin yet)</span>}
                      </span>
                      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: SLATE }}>{c.members.length}</span>
                    </div>
                  ))}
                </div>

                {/* Selected city's members */}
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${PARCHMENT_DEEP}`, background: "#fff", boxShadow: SOFT_SHADOW }}>
                  <div className="flex items-center justify-between px-5 py-3" style={{ background: INK }}>
                    <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 16, color: PARCHMENT }}>
                      {activeCity ? activeCity.city : "Select a city"}
                    </span>
                    {activeCity && (
                      <button onClick={() => setSelectedCity(null)} style={{ color: BRASS_LIGHT }}>
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  {!activeCity ? (
                    <div className="px-5 py-6 text-center" style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE, fontStyle: "italic" }}>
                      Click a pin on the map or a city on the left to see who's there.
                    </div>
                  ) : (
                    activeCity.members.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelected(p)}
                        className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:opacity-90"
                        style={{ borderTop: `1px solid ${PARCHMENT_DEEP}` }}
                      >
                        <Initials first={p.firstName} last={p.lastName} />
                        <div className="flex-1">
                          <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: INK }}>{p.firstName} {p.lastName}</div>
                          <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 12, color: SLATE }}>{p.role} · {p.neighborhood}</div>
                        </div>
                        <ChevronRight size={15} color={BRASS} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Matriculation (High School / College, toggled) */}
        {dashboardTab === "matriculation" && (
          <div>
            <div className="flex gap-2 mb-5">
              {[
                { key: "hs", label: "High School" },
                { key: "college", label: "College" },
              ].map((v) => (
                <button
                  key={v.key}
                  onClick={() => setMatriculationView(v.key)}
                  className="px-4 py-2 rounded-sm"
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    background: matriculationView === v.key ? ROYAL : "#fff",
                    color: matriculationView === v.key ? "#fff" : SLATE,
                    border: `1px solid ${matriculationView === v.key ? ROYAL : PARCHMENT_DEEP}`,
                  }}
                >
                  {v.label.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-sm mb-5" style={{ background: "#fff", border: `1px solid ${PARCHMENT_DEEP}` }}>
              <Search size={15} color={SLATE} />
              <input
                value={matriculationSearch}
                onChange={(e) => setMatriculationSearch(e.target.value)}
                placeholder="Search by school name..."
                className="w-full outline-none bg-transparent"
                style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: INK }}
              />
            </div>

            {matriculationView === "hs" ? (
              <div className="space-y-6">
                {(() => {
                  const q = matriculationSearch.trim().toLowerCase();
                  const shown = q ? hsMatriculation.filter(([school]) => school.toLowerCase().includes(q)) : hsMatriculation;
                  if (shown.length === 0) {
                    return (
                      <div className="text-center py-10" style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: SLATE }}>
                        {hsMatriculation.length === 0 ? "No high school matriculation data to display yet." : "No high schools match that search."}
                      </div>
                    );
                  }
                  return shown.map(([school, alums]) => (
                    <div key={school} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${PARCHMENT_DEEP}`, background: "#fff", boxShadow: SOFT_SHADOW }}>
                      <div className="flex items-center justify-between px-5 py-3" style={{ background: INK }}>
                        <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 18, color: PARCHMENT }}>{school}</span>
                        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em", color: BRASS_LIGHT }}>
                          {alums.length} {alums.length === 1 ? "ALUM" : "ALUMNI"}
                        </span>
                      </div>
                      {alums.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelected(p)}
                          className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:opacity-90"
                          style={{ borderTop: `1px solid ${PARCHMENT_DEEP}` }}
                        >
                          <Initials first={p.firstName} last={p.lastName} />
                          <div className="flex-1">
                            <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: INK }}>{p.firstName} {p.lastName}</div>
                            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: SLATE }}>
                              Buckley Class of {p.gradYear}{p.college ? ` · ${p.college}` : ""}
                            </div>
                          </div>
                          <ChevronRight size={15} color={BRASS} />
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const q = matriculationSearch.trim().toLowerCase();
                  const shown = q ? collegeMatriculation.filter(([college]) => college.toLowerCase().includes(q)) : collegeMatriculation;
                  if (shown.length === 0) {
                    return (
                      <div className="text-center py-10" style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: SLATE }}>
                        {collegeMatriculation.length === 0 ? "No college matriculation data to display yet." : "No colleges match that search."}
                      </div>
                    );
                  }
                  return shown.map(([college, alums]) => (
                    <div key={college} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${PARCHMENT_DEEP}`, background: "#fff", boxShadow: SOFT_SHADOW }}>
                      <div className="flex items-center justify-between px-5 py-3" style={{ background: INK }}>
                        <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 18, color: PARCHMENT }}>{college}</span>
                        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em", color: BRASS_LIGHT }}>
                          {alums.length} {alums.length === 1 ? "ALUM" : "ALUMNI"}
                        </span>
                      </div>
                      {alums.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelected(p)}
                          className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:opacity-90"
                          style={{ borderTop: `1px solid ${PARCHMENT_DEEP}` }}
                        >
                          <Initials first={p.firstName} last={p.lastName} />
                          <div className="flex-1">
                            <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: INK }}>{p.firstName} {p.lastName}</div>
                            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: SLATE }}>
                              Buckley Class of {p.gradYear}{p.highSchool ? ` · ${p.highSchool}` : ""}
                            </div>
                          </div>
                          <ChevronRight size={15} color={BRASS} />
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

        {/* Optimus.AI */}
        {dashboardTab === "aisearch" && (
          <div>
            <div className="mb-5 text-center">
              <div className="flex items-center justify-center gap-2">
                <Sparkles size={18} color={ROYAL} />
                <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 24, color: INK }}>Optimus.AI</div>
              </div>
              <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE, marginTop: 4, maxWidth: 560, margin: "4px auto 0" }}>
                Describe what you're looking for, and this matches you with Buckley community members based on how they said they can help, their career field, and more. Runs entirely in your browser — no account or sign-in needed to use it.
              </div>
            </div>

            <div
              className="rounded-xl overflow-hidden mb-4"
              style={{ border: `1px solid ${PARCHMENT_DEEP}`, background: "#fff", minHeight: 220, maxHeight: 520, overflowY: "auto", boxShadow: SOFT_SHADOW }}
            >
              {aiHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center px-8" style={{ minHeight: 220 }}>
                  <Sparkles size={22} color={BRASS} />
                  <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE, marginTop: 10, maxWidth: 380 }}>
                    Try something like "mentorship breaking into private equity" or "advice moving to Chicago" or "college advice for a son interested in engineering."
                  </div>
                </div>
              ) : (
                <div className="p-5 space-y-5">
                  {aiHistory.map((entry, i) => (
                    <div key={i}>
                      <div className="flex justify-end mb-3">
                        <div
                          className="px-4 py-2.5 rounded-sm"
                          style={{ background: ROYAL, color: "#fff", fontFamily: "Source Serif 4, serif", fontSize: 14, maxWidth: "80%" }}
                        >
                          {entry.query}
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div style={{ maxWidth: "92%", width: "100%" }}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles size={13} color={BRASS} />
                            <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.06em", color: SLATE }}>
                              {entry.matches.length === 0
                                ? "NO STRONG MATCHES"
                                : `${entry.matches.length} POSSIBLE ${entry.matches.length === 1 ? "MATCH" : "MATCHES"}`}
                            </span>
                          </div>
                          {entry.matches.length === 0 ? (
                            <div
                              className="px-4 py-3 rounded-sm"
                              style={{ background: PARCHMENT, fontFamily: "Source Serif 4, serif", fontSize: 13, color: SLATE }}
                            >
                              Nothing matched closely. Try mentioning a career field, a city, or a specific kind of help — e.g. "mentorship," "introductions," or "college advice."
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {entry.matches.map(({ person: p, matchedLabels }) => (
                                <div
                                  key={p.id}
                                  onClick={() => setSelected(p)}
                                  className="flex items-start gap-3 px-4 py-3 rounded-sm cursor-pointer hover:opacity-90"
                                  style={{ background: PARCHMENT, border: `1px solid ${PARCHMENT_DEEP}` }}
                                >
                                  <Initials first={p.firstName} last={p.lastName} />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 14, color: INK }}>{p.firstName} {p.lastName}</div>
                                      <ChevronRight size={14} color={BRASS} />
                                    </div>
                                    <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 12, color: SLATE }}>
                                      {p.occupation}{p.field ? ` · ${p.field}` : ""}
                                    </div>
                                    {p.helpOffer && (
                                      <div style={{ fontFamily: "Source Serif 4, serif", fontSize: 12, fontStyle: "italic", color: INK, marginTop: 4 }}>
                                        "{p.helpOffer}"
                                      </div>
                                    )}
                                    <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9, letterSpacing: "0.05em", color: BRASS, marginTop: 5 }}>
                                      MATCHED ON: {matchedLabels.join(", ").toUpperCase()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAiSearch(); }}
                placeholder="What are you looking for help with?"
                style={fldStyle}
              />
              <button
                onClick={handleAiSearch}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-sm flex-shrink-0 transition-opacity hover:opacity-90"
                style={{ background: ROYAL, color: "#fff", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, letterSpacing: "0.06em" }}
              >
                <SendHorizontal size={14} /> SEARCH
              </button>
              {aiHistory.length > 0 && (
                <button
                  onClick={() => setAiHistory([])}
                  className="flex-shrink-0 px-3 py-2.5 rounded-sm"
                  style={{ border: `1px solid ${PARCHMENT_DEEP}`, color: SLATE, fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.06em" }}
                  title="Clear conversation"
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 flex items-center justify-center p-6 z-50" style={{ background: "rgba(16,27,45,0.6)" }} onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: PARCHMENT, border: `1px solid ${BRASS}`, boxShadow: "0 25px 70px rgba(19, 42, 52, 0.45)" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ background: INK_DEEP }}>
              <div className="flex items-center gap-3">
                <Initials first={selected.firstName} last={selected.lastName} />
                <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 19, color: PARCHMENT }}>{selected.firstName} {selected.lastName}</div>
              </div>
              <button onClick={() => setSelected(null)}><X size={18} color={BRASS_LIGHT} /></button>
            </div>
            <div className="p-6 space-y-3">
              {selected.helpOffer && (
                <div className="pb-3 mb-1" style={{ borderBottom: `1px solid ${PARCHMENT_DEEP}` }}>
                  <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em", color: SLATE, marginBottom: 4 }}>
                    HOW {selected.firstName?.toUpperCase()} CAN HELP
                  </div>
                  <div style={{ fontFamily: "Source Serif 4, serif", fontStyle: "italic", fontSize: 13, color: INK }}>
                    "{selected.helpOffer}"
                  </div>
                </div>
              )}
              <DetailRow label="Role" value={selected.role} />
              {selected.gradYear && <DetailRow label="Graduation Year" value={selected.gradYear} />}
              {selected.children && selected.children.length > 0 && (
                <DetailRow
                  label={selected.children.length > 1 ? "Children" : "Child"}
                  value={selected.children.map((c) => `${c.name} · ${formatChild(c) || "—"}`).join("; ")}
                />
              )}
              <DetailRow label="Email" value={selected.email} />
              <DetailRow label="Phone" value={selected.phone} />
              {selected.city && <DetailRow label="City" value={selected.city} />}
              <DetailRow label="Neighborhood" value={selected.neighborhood} />
              {selected.highSchool && <DetailRow label="High School" value={selected.highSchool} />}
              {selected.college && <DetailRow label="College" value={selected.college} />}
              <DetailRow label="Career Field" value={selected.field ? `${selected.field}${selected.subfield ? " · " + selected.subfield : ""}` : "—"} />
              <DetailRow label="Occupation" value={selected.occupation} />
              <DetailRow label="Employer" value={selected.company} />
              {(selected.linkedin || selected.instagram || selected.twitter || (selected.otherSocialPlatform && selected.otherSocialHandle)) && (
                <div className="flex items-center gap-2 pt-2" style={{ borderTop: `1px solid ${PARCHMENT_DEEP}` }}>
                  {selected.linkedin && (
                    <a
                      href={socialProfileUrl("linkedin", selected.linkedin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center transition-opacity hover:opacity-80"
                      style={{ width: 30, height: 30, borderRadius: 4, background: "#0A66C2" }}
                      title="Open LinkedIn profile"
                    >
                      <Linkedin size={15} color="#fff" />
                    </a>
                  )}
                  {selected.instagram && (
                    <a
                      href={socialProfileUrl("instagram", selected.instagram)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center transition-opacity hover:opacity-80"
                      style={{ width: 30, height: 30, borderRadius: 4, background: "linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)" }}
                      title="Open Instagram profile"
                    >
                      <Instagram size={15} color="#fff" />
                    </a>
                  )}
                  {selected.twitter && (
                    <a
                      href={socialProfileUrl("twitter", selected.twitter)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center transition-opacity hover:opacity-80"
                      style={{ width: 30, height: 30, borderRadius: 4, background: INK }}
                      title="Open X / Twitter profile"
                    >
                      <Twitter size={15} color="#fff" />
                    </a>
                  )}
                  {selected.otherSocialPlatform && selected.otherSocialHandle && (
                    <a
                      href={otherSocialUrl(selected.otherSocialPlatform, selected.otherSocialHandle)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center transition-opacity hover:opacity-80"
                      style={{ width: 30, height: 30, borderRadius: 4, background: BRASS }}
                      title={`Open ${selected.otherSocialPlatform}`}
                    >
                      <Link2 size={15} color="#fff" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
