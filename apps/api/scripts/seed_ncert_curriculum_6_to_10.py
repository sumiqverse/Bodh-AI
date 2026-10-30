"""Seed comprehensive NCERT Curriculum for Classes 6 to 10 across Mathematics, Science, Social Science, English, and Hindi into PostgreSQL."""

import asyncio
import sys
import uuid
from pathlib import Path

# Ensure apps/api root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.core.question_bank import generate_authentic_questions_for_skill
from app.db.base import Base
from app.db.session import get_engine, get_session_factory
from app.models.assessment import Question, QuestionTranslation
from app.models.curriculum import Curriculum, Prerequisite, Skill, Topic

# Master NCERT Syllabus Data Dictionary for Classes 6 to 10
NCERT_DATA = {
    6: {
        "mathematics": [
            (
                "TOPIC-M6-01",
                "Knowing Our Numbers",
                "Place value systems, estimation, comparing numbers, Roman numerals",
                [
                    (
                        "SKILL-M6-01-01",
                        "Place Value in Indian and International Systems",
                        "Reading and writing large numbers",
                        0.35,
                        "understand",
                    ),
                    (
                        "SKILL-M6-01-02",
                        "Estimation and Rounding Off",
                        "Rounding off to nearest tens, hundreds and thousands",
                        0.45,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M6-02",
                "Whole Numbers",
                "Predecessor, successor, number line, properties of whole numbers",
                [
                    (
                        "SKILL-M6-02-01",
                        "Properties of Whole Numbers",
                        "Closure, commutativity, and distributivity",
                        0.40,
                        "understand",
                    ),
                    (
                        "SKILL-M6-02-02",
                        "Number Line Arithmetic",
                        "Addition, subtraction and multiplication on number line",
                        0.35,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M6-03",
                "Playing with Numbers",
                "Factors, multiples, prime factorization, HCF and LCM",
                [
                    (
                        "SKILL-M6-03-01",
                        "Prime and Composite Numbers & Divisibility",
                        "Tests for divisibility by 2, 3, 4, 5, 6, 8, 9, 10, 11",
                        0.50,
                        "apply",
                    ),
                    (
                        "SKILL-M6-03-02",
                        "Highest Common Factor & Least Common Multiple",
                        "Finding HCF and LCM by prime factorization",
                        0.60,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M6-04",
                "Basic Geometrical Ideas",
                "Points, lines, curves, polygons, angles, triangles, circles",
                [
                    (
                        "SKILL-M6-04-01",
                        "Lines, Rays, and Angles",
                        "Identifying intersecting lines, parallel lines, ray origins, and angle vertices",
                        0.35,
                        "remember",
                    ),
                    (
                        "SKILL-M6-04-02",
                        "Polygons and Circles",
                        "Sides, vertices, diagonals of polygons; radius, chord, diameter of circles",
                        0.45,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-M6-05",
                "Integers",
                "Negative numbers, representation on number line, ordering, operations",
                [
                    (
                        "SKILL-M6-05-01",
                        "Concept of Negative Integers",
                        "Position on number line relative to zero",
                        0.40,
                        "understand",
                    ),
                    (
                        "SKILL-M6-05-02",
                        "Addition and Subtraction of Integers",
                        "Using number line and sign rules",
                        0.55,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M6-06",
                "Fractions and Decimals",
                "Proper, improper, mixed fractions, decimal place values",
                [
                    (
                        "SKILL-M6-06-01",
                        "Equivalent Fractions and Simplification",
                        "Generating equivalent fractions and reducing to simplest form",
                        0.45,
                        "apply",
                    ),
                    (
                        "SKILL-M6-06-02",
                        "Decimal Place Value and Conversion",
                        "Tenths, hundredths, thousandths and converting fractions to decimals",
                        0.50,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M6-07",
                "Mensuration",
                "Perimeter of polygons and area of regular figures",
                [
                    (
                        "SKILL-M6-07-01",
                        "Perimeter of Rectangles and Regular Polygons",
                        "Formula P = 2(l+b) and P = n * s",
                        0.45,
                        "apply",
                    ),
                    (
                        "SKILL-M6-07-02",
                        "Area of Rectangles and Squares",
                        "Calculating area by unit squares and formula A = l * b",
                        0.50,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M6-08",
                "Algebra and Ratio Proportion",
                "Variables, algebraic expressions, ratio, and unitary method",
                [
                    (
                        "SKILL-M6-08-01",
                        "Introduction to Variables & Algebraic Expressions",
                        "Matchstick patterns and variable relationships",
                        0.45,
                        "understand",
                    ),
                    (
                        "SKILL-M6-08-02",
                        "Ratios and Unitary Method",
                        "Comparing quantities by division and solving real-world unitary problems",
                        0.55,
                        "apply",
                    ),
                ],
            ),
        ],
        "science": [
            (
                "TOPIC-S6-01",
                "Components of Food",
                "Nutrients, balanced diet, and deficiency diseases",
                [
                    (
                        "SKILL-S6-01-01",
                        "Major Nutrients & Dietary Testing",
                        "Testing for starch, protein, and fats in food samples",
                        0.40,
                        "apply",
                    ),
                    (
                        "SKILL-S6-01-02",
                        "Balanced Diet & Deficiency Diseases",
                        "Identifying scurvy, rickets, beriberi, and anemia causes",
                        0.35,
                        "remember",
                    ),
                ],
            ),
            (
                "TOPIC-S6-02",
                "Sorting Materials into Groups",
                "Properties of materials: appearance, hardness, solubility, transparency",
                [
                    (
                        "SKILL-S6-02-01",
                        "Classification of Materials",
                        "Distinguishing transparent, translucent, opaque, soluble and insoluble substances",
                        0.35,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S6-03",
                "Separation of Substances",
                "Handpicking, winnowing, sieving, sedimentation, decantation, filtration",
                [
                    (
                        "SKILL-S6-03-01",
                        "Mixture Separation Techniques",
                        "Applying sedimentation, decantation, filtration, and evaporation",
                        0.45,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-S6-04",
                "Getting to Know Plants",
                "Herbs, shrubs, trees, leaf venation, root systems, and flowers",
                [
                    (
                        "SKILL-S6-04-01",
                        "Plant Classification & Leaf Venation",
                        "Reticulate vs parallel venation and fibrous vs tap roots",
                        0.40,
                        "understand",
                    ),
                    (
                        "SKILL-S6-04-02",
                        "Structure of a Flower",
                        "Sepals, petals, stamens, and pistil functions",
                        0.45,
                        "remember",
                    ),
                ],
            ),
            (
                "TOPIC-S6-05",
                "Body Movements",
                "Human skeleton, joints, and animal locomotion",
                [
                    (
                        "SKILL-S6-05-01",
                        "Types of Joints in Human Skeleton",
                        "Ball and socket, pivotal, hinge, and fixed joints",
                        0.45,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S6-06",
                "Motion and Measurement",
                "Standard units of measurement, rectilinear, circular, periodic motion",
                [
                    (
                        "SKILL-S6-06-01",
                        "SI Units and Distance Measurement",
                        "Using meters, centimeters, millimeters correctly",
                        0.35,
                        "apply",
                    ),
                    (
                        "SKILL-S6-06-02",
                        "Types of Motion",
                        "Differentiating rectilinear, circular, and periodic movements",
                        0.40,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-S6-07",
                "Light, Shadows and Reflections",
                "Luminous objects, shadow formation, pinhole camera, reflection",
                [
                    (
                        "SKILL-S6-07-01",
                        "Shadow Formation & Propagation of Light",
                        "Rectilinear propagation of light and conditions for shadow formation",
                        0.40,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S6-08",
                "Electricity and Circuits",
                "Electric cell, bulb, circuit diagrams, conductors and insulators",
                [
                    (
                        "SKILL-S6-08-01",
                        "Electric Circuits and Switches",
                        "Creating closed electrical circuits with cells and bulbs",
                        0.45,
                        "apply",
                    ),
                    (
                        "SKILL-S6-08-02",
                        "Conductors vs Insulators",
                        "Identifying materials that allow or resist electric current",
                        0.35,
                        "remember",
                    ),
                ],
            ),
        ],
        "social_science": [
            (
                "TOPIC-SST6-01",
                "What, Where, How and When?",
                "Historical sources, manuscripts, inscriptions, archaeology",
                [
                    (
                        "SKILL-SST6-01-01",
                        "Sources of Historical Evidence",
                        "Analyzing manuscripts, inscriptions, and archaeological artifacts",
                        0.40,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-SST6-02",
                "In the Earliest Cities: Harappa",
                "Indus Valley civilization, town planning, seals, crafts",
                [
                    (
                        "SKILL-SST6-02-01",
                        "Harappan Town Planning & Architecture",
                        "The Great Bath, citadel, drainage system, and granaries",
                        0.45,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-SST6-03",
                "The Earth in the Solar System",
                "Planets, satellites, asteroids, meteoroids, constellations",
                [
                    (
                        "SKILL-SST6-03-01",
                        "Planetary System and the Sun",
                        "Order of planets, unique features of Earth, and Moon phases",
                        0.35,
                        "remember",
                    ),
                ],
            ),
            (
                "TOPIC-SST6-04",
                "Globe: Latitudes and Longitudes",
                "Equator, parallels of latitude, meridians, time zones",
                [
                    (
                        "SKILL-SST6-04-01",
                        "Latitudes, Longitudes, and Standard Time",
                        "Calculating time difference using 1 degree = 4 minutes rule",
                        0.55,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-SST6-05",
                "Understanding Diversity and Government",
                "Cultural diversity, prejudice, discrimination, democratic government",
                [
                    (
                        "SKILL-SST6-05-01",
                        "Diversity, Equality, and Constitution",
                        "Understanding diversity in India and constitutional safeguards against discrimination",
                        0.40,
                        "understand",
                    ),
                    (
                        "SKILL-SST6-05-02",
                        "Levels and Types of Government",
                        "Local, State, and National levels; Universal Adult Franchise",
                        0.45,
                        "understand",
                    ),
                ],
            ),
        ],
        "english": [
            (
                "TOPIC-ENG6-01",
                "Reading Comprehension & Vocabulary",
                "Factual, narrative, and inferential comprehension passages",
                [
                    (
                        "SKILL-ENG6-01-01",
                        "Main Idea and Detail Extraction",
                        "Identifying theme, key arguments, and supporting facts in passages",
                        0.40,
                        "understand",
                    ),
                    (
                        "SKILL-ENG6-01-02",
                        "Contextual Vocabulary & Antonyms",
                        "Inferring word meanings and identifying opposites from textual context",
                        0.45,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-ENG6-02",
                "Grammar: Parts of Speech & Tenses",
                "Nouns, pronouns, verbs, simple tenses, and subject-verb agreement",
                [
                    (
                        "SKILL-ENG6-02-01",
                        "Subject-Verb Concord",
                        "Matching singular/plural subjects with appropriate verb forms",
                        0.50,
                        "apply",
                    ),
                    (
                        "SKILL-ENG6-02-02",
                        "Simple Present, Past, and Continuous Tenses",
                        "Accurate usage of primary tense forms in sentences",
                        0.45,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-ENG6-03",
                "Writing Skills: Letters and Paragraphs",
                "Formal/informal letters, descriptive paragraphs, and notices",
                [
                    (
                        "SKILL-ENG6-03-01",
                        "Informal Letter & Notice Writing Format",
                        "Structuring addresses, salutations, body content, and sign-offs",
                        0.45,
                        "apply",
                    ),
                ],
            ),
        ],
        "hindi": [
            (
                "TOPIC-HIN6-01",
                "व्याकरण: वर्ण, शब्द और संज्ञा",
                "वर्णमाला, स्वर, व्यंजन, संज्ञा और उसके भेद",
                [
                    (
                        "SKILL-HIN6-01-01",
                        "संज्ञा के भेद (व्यक्तिवाचक, जातिवाचक, भाववाचक)",
                        "वाक्यों में संज्ञा शब्दों की सही पहचान और वर्गीकरण",
                        0.40,
                        "understand",
                    ),
                    (
                        "SKILL-HIN6-01-02",
                        "विलोम एवं पर्यायवाची शब्द",
                        "प्रचलित शब्दों के विलोम और समानार्थक शब्दों का सही प्रयोग",
                        0.45,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-HIN6-02",
                "व्याकरण: सर्वनाम, विशेषण और काल",
                "सर्वनाम के भेद, गुणवाचक/संख्यावाचक विशेषण, वर्तमान/भूत/भविष्य काल",
                [
                    (
                        "SKILL-HIN6-02-01",
                        "सर्वनाम और विशेषण की पहचान",
                        "वाक्यों में सर्वनाम और विशेषण पदों का सटीक प्रयोग",
                        0.45,
                        "apply",
                    ),
                    (
                        "SKILL-HIN6-02-02",
                        "काल के भेद एवं परिवर्तन",
                        "भूतकाल, वर्तमान काल और भविष्य काल में वाक्यों का रूपांतरण",
                        0.50,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-HIN6-03",
                "अपठित बोध एवं पत्र लेखन",
                "अपठित गद्यांश, औपचारिक व अनौपचारिक पत्र लेखन",
                [
                    (
                        "SKILL-HIN6-03-01",
                        "अपठित गद्यांश से प्रश्नोत्तर",
                        "गद्यांश के मूल भाव को समझकर सटीक उत्तर लिखना",
                        0.40,
                        "understand",
                    ),
                ],
            ),
        ],
    },
    7: {
        "mathematics": [
            (
                "TOPIC-M7-01",
                "Integers: Multiplication and Division",
                "Rules of signs, additive and multiplicative identities, word problems",
                [
                    (
                        "SKILL-M7-01-01",
                        "Integer Multiplication and Division Signs",
                        "Multiplying/dividing signed integers (-a) * (-b) = ab",
                        0.45,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M7-02",
                "Fractions and Decimals",
                "Multiplication and division of fractions, decimal division",
                [
                    (
                        "SKILL-M7-02-01",
                        "Fraction Multiplication and Division",
                        "Reciprocals and cross-simplification in fraction operations",
                        0.50,
                        "apply",
                    ),
                    (
                        "SKILL-M7-02-02",
                        "Decimal Operations and Word Problems",
                        "Multiplication and division of decimal values with precision",
                        0.55,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M7-03",
                "Simple Equations",
                "Forming equations, balancing method, transposing terms",
                [
                    (
                        "SKILL-M7-03-01",
                        "Solving Linear Equations by Transposition",
                        "Isolating variables using reverse inverse operations",
                        0.55,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M7-04",
                "Lines, Angles and Triangles",
                "Complementary, supplementary, vertically opposite, transversal angles, exterior angle theorem",
                [
                    (
                        "SKILL-M7-04-01",
                        "Angle Relationships & Parallel Lines",
                        "Alternate interior, corresponding, and co-interior angles",
                        0.55,
                        "apply",
                    ),
                    (
                        "SKILL-M7-04-02",
                        "Angle Sum and Exterior Angle Theorem of Triangles",
                        "Sum of interior angles = 180 degrees and exterior angle property",
                        0.50,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M7-05",
                "Comparing Quantities",
                "Percentage, profit and loss, simple interest",
                [
                    (
                        "SKILL-M7-05-01",
                        "Percentages and Profit-Loss Calculations",
                        "Finding profit/loss percentage on cost price",
                        0.55,
                        "apply",
                    ),
                    (
                        "SKILL-M7-05-02",
                        "Simple Interest Formula",
                        "Calculating SI = (P * R * T) / 100 and Total Amount",
                        0.50,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M7-06",
                "Perimeter, Area and Algebraic Expressions",
                "Area of parallelogram, triangle, circle; combining like terms",
                [
                    (
                        "SKILL-M7-06-01",
                        "Circumference and Area of Circles",
                        "Using pi = 22/7, C = 2*pi*r, and A = pi*r^2",
                        0.55,
                        "apply",
                    ),
                    (
                        "SKILL-M7-06-02",
                        "Simplifying Algebraic Expressions",
                        "Combining like terms and evaluating expressions for given values",
                        0.50,
                        "apply",
                    ),
                ],
            ),
        ],
        "science": [
            (
                "TOPIC-S7-01",
                "Nutrition in Plants and Animals",
                "Autotrophic, heterotrophic, photosynthesis, human digestive system",
                [
                    (
                        "SKILL-S7-01-01",
                        "Photosynthesis Reaction and Factors",
                        "Role of chlorophyll, stomata, sunlight, CO2, and water",
                        0.45,
                        "understand",
                    ),
                    (
                        "SKILL-S7-01-02",
                        "Human Digestive Organs & Enzyme Action",
                        "Alimentary canal, peristalsis, bile, gastric juice functions",
                        0.50,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S7-02",
                "Heat and Temperature",
                "Clinical/laboratory thermometers, conduction, convection, radiation",
                [
                    (
                        "SKILL-S7-02-01",
                        "Heat Transfer Modes",
                        "Distinguishing conduction, convection, and radiation with practical examples",
                        0.45,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-S7-03",
                "Acids, Bases and Salts",
                "Litmus, turmeric, phenolphthalein, neutralization reaction",
                [
                    (
                        "SKILL-S7-03-01",
                        "Natural Indicators and Neutralization",
                        "Testing with litmus/turmeric and neutralization acid + base = salt + water",
                        0.45,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-S7-04",
                "Physical and Chemical Changes",
                "Rusting of iron, crystallization, chemical reactions",
                [
                    (
                        "SKILL-S7-04-01",
                        "Differentiating Physical vs Chemical Changes",
                        "Identifying irreversible changes, gas evolution, and precipitate formation",
                        0.40,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-S7-05",
                "Respiration in Organisms",
                "Aerobic vs anaerobic respiration, cellular respiration, breathing rate",
                [
                    (
                        "SKILL-S7-05-01",
                        "Aerobic vs Anaerobic Respiration",
                        "Comparing energy yield, lactic acid in muscles, and yeast fermentation",
                        0.50,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S7-06",
                "Electric Current and Light",
                "Electromagnets, electric bell, spherical mirrors, lenses",
                [
                    (
                        "SKILL-S7-06-01",
                        "Magnetic Effects of Electric Current",
                        "Working of electromagnets and electric fuses",
                        0.50,
                        "apply",
                    ),
                    (
                        "SKILL-S7-06-02",
                        "Spherical Mirrors: Concave and Convex",
                        "Real vs virtual images and application in vehicle headlights and mirrors",
                        0.55,
                        "understand",
                    ),
                ],
            ),
        ],
        "social_science": [
            (
                "TOPIC-SST7-01",
                "Medieval Indian History: Delhi Sultans & Mughals",
                "Slave dynasty, Alauddin Khalji, Akbar, revenue system, architecture",
                [
                    (
                        "SKILL-SST7-01-01",
                        "Administration of Delhi Sultanate",
                        "Iqta system, garrison towns, and market control under Khalji",
                        0.50,
                        "understand",
                    ),
                    (
                        "SKILL-SST7-01-02",
                        "Mughal Empire: Mansabdari & Sulh-i-Kul",
                        "Akbar's administrative policies, Mansabdari system, and religious tolerance",
                        0.50,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-SST7-02",
                "Our Changing Earth & Interior Structure",
                "Crust, mantle, core, plate tectonics, earthquakes, volcanoes, weathering",
                [
                    (
                        "SKILL-SST7-02-01",
                        "Earth's Layers and Plate Tectonics",
                        "Core-mantle-crust composition, seismic waves, and volcanic activity",
                        0.45,
                        "understand",
                    ),
                    (
                        "SKILL-SST7-02-02",
                        "Exogenic Processes: River, Wind, and Glacier Landforms",
                        "Meanders, ox-bow lakes, sand dunes, and moraines formation",
                        0.50,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-SST7-03",
                "Equality, State Government, and Media",
                "Article 15, Legislative Assembly (MLA), role of media in democracy",
                [
                    (
                        "SKILL-SST7-03-01",
                        "Functioning of State Government & MLA Role",
                        "Constituency elections, ruling party vs opposition, and passage of bills",
                        0.45,
                        "understand",
                    ),
                ],
            ),
        ],
        "english": [
            (
                "TOPIC-ENG7-01",
                "Reading Comprehension: Literary & Descriptive",
                "Inferring author tone, figurative expressions, contextual meaning",
                [
                    (
                        "SKILL-ENG7-01-01",
                        "Inferential Comprehension & Theme Identification",
                        "Drawing conclusions and determining implicit central message",
                        0.50,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-ENG7-02",
                "Grammar: Modals, Voice, and Clauses",
                "Can, may, must, should, active-passive voice, dependent clauses",
                [
                    (
                        "SKILL-ENG7-02-01",
                        "Modal Auxiliaries for Permission, Obligation, Ability",
                        "Using must, should, ought to, can, could appropriately",
                        0.50,
                        "apply",
                    ),
                    (
                        "SKILL-ENG7-02-02",
                        "Active and Passive Voice Transformation",
                        "Converting sentences between active and passive voice in present and past",
                        0.55,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-ENG7-03",
                "Writing: Formal Letters and Story Writing",
                "Letters to the Editor, complaint letters, narrative story construction",
                [
                    (
                        "SKILL-ENG7-03-01",
                        "Formal Letter Writing Format and Tone",
                        "Drafting structured formal letters with concise objective and courteous closing",
                        0.50,
                        "apply",
                    ),
                ],
            ),
        ],
        "hindi": [
            (
                "TOPIC-HIN7-01",
                "व्याकरण: संधि एवं समास",
                "स्वर संधि (दीर्घ, गुण, वृद्धि), तत्पुरुष, कर्मधारय, द्वंद्व समास",
                [
                    (
                        "SKILL-HIN7-01-01",
                        "स्वर संधि के नियम एवं विच्छेद",
                        "दीर्घ, गुण और वृद्धि संधि का सही विच्छेद और निर्माण",
                        0.55,
                        "apply",
                    ),
                    (
                        "SKILL-HIN7-01-02",
                        "समास विग्रह एवं भेद की पहचान",
                        "तत्पुरुष, कर्मधारय, और द्वंद्व समास का विग्रह करना",
                        0.50,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-HIN7-02",
                "व्याकरण: कारक, उपसर्ग और प्रत्यय",
                "आठों कारक चिह्न, तत्सम-तद्भव उपसर्ग, कृत व तद्धित प्रत्यय",
                [
                    (
                        "SKILL-HIN7-02-01",
                        "कारक चिह्नों का सटीक प्रयोग",
                        "कर्ता से अधिकरण तक उपयुक्त परसर्गों की पहचान",
                        0.45,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-HIN7-03",
                "अपठित बोध एवं संवाद लेखन",
                "अपठित गद्यांश, समसामयिक विषयों पर संवाद लेखन",
                [
                    (
                        "SKILL-HIN7-03-01",
                        "संवाद लेखन एवं अनुच्छेद रचना",
                        "स्वाभाविक, रोचक एवं व्याकरणसम्मत भाषा में संवाद लिखना",
                        0.45,
                        "create",
                    ),
                ],
            ),
        ],
    },
    8: {
        "mathematics": [
            (
                "TOPIC-M8-01",
                "Rational Numbers: Properties & Number Line",
                "Closure, commutative, associative, distributive properties, density",
                [
                    (
                        "SKILL-M8-01-01",
                        "Rational Number Properties & Distributivity",
                        "Applying a(b+c) = ab+ac and inverses",
                        0.50,
                        "apply",
                    ),
                    (
                        "SKILL-M8-01-02",
                        "Number Line Representation & Density",
                        "Finding rational numbers between any two fractions",
                        0.55,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M8-02",
                "Linear Equations in One Variable",
                "Equations with variables on both sides, reducible forms, word problems",
                [
                    (
                        "SKILL-M8-02-01",
                        "Linear Equations: Variables on Both Sides",
                        "Transposition and bracket expansion",
                        0.60,
                        "apply",
                    ),
                    (
                        "SKILL-M8-02-02",
                        "Word Problems on Ages, Numbers, and Perimeter",
                        "Translating verbal statements into solvable equations",
                        0.65,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M8-03",
                "Understanding Quadrilaterals",
                "Angle sum, exterior angles, trapezium, parallelogram, rhombus, rectangle, square",
                [
                    (
                        "SKILL-M8-03-01",
                        "Angle Sum and Exterior Angles of Polygons",
                        "Formula (n-2)*180 and exterior sum = 360",
                        0.55,
                        "apply",
                    ),
                    (
                        "SKILL-M8-03-02",
                        "Properties of Parallelograms and Special Quadrilaterals",
                        "Opposite sides, diagonal bisectors, perpendicular diagonals",
                        0.60,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-M8-04",
                "Squares, Cubes and Their Roots",
                "Prime factorization, long division method for square roots, cube root estimation",
                [
                    (
                        "SKILL-M8-04-01",
                        "Square Roots by Long Division Method",
                        "Computing square roots of non-perfect squares and decimals",
                        0.60,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M8-05",
                "Algebraic Expressions, Identities & Factorisation",
                "Standard identities (a+b)^2, (a-b)^2, a^2-b^2, splitting middle term",
                [
                    (
                        "SKILL-M8-05-01",
                        "Algebraic Identities Applications",
                        "Expanding and computing products using standard algebraic identities",
                        0.60,
                        "apply",
                    ),
                    (
                        "SKILL-M8-05-02",
                        "Factorisation by Grouping & Middle Term",
                        "Factoring quadratic expressions ax^2 + bx + c",
                        0.65,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M8-06",
                "Mensuration: Solid Shapes Surface Area & Volume",
                "Cylinder, cone, sphere, cuboid surface area and volume",
                [
                    (
                        "SKILL-M8-06-01",
                        "Surface Area and Volume of Cylinder and Cuboid",
                        "Calculating total surface area and capacity of cylinders",
                        0.65,
                        "apply",
                    ),
                ],
            ),
        ],
        "science": [
            (
                "TOPIC-S8-01",
                "Crop Production and Management",
                "Agricultural practices, irrigation, manure vs fertilizer, crop rotation",
                [
                    (
                        "SKILL-S8-01-01",
                        "Agricultural Practices & Soil Preparation",
                        "Tilling, sowing, drip vs sprinkler irrigation systems",
                        0.45,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S8-02",
                "Microorganisms: Friend and Foe",
                "Bacteria, fungi, protozoa, viruses, fermentation, antibiotics, pathogens",
                [
                    (
                        "SKILL-S8-02-01",
                        "Beneficial & Pathogenic Microorganisms",
                        "Role in curd making, nitrogen fixation, vaccines, and infectious diseases",
                        0.50,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S8-03",
                "Metals, Non-Metals and Combustion",
                "Physical/chemical properties, reactivity series, flame zones, calorific value",
                [
                    (
                        "SKILL-S8-03-01",
                        "Chemical Properties of Metals & Reactivity Series",
                        "Reactions with water, acids, and displacement reactions",
                        0.55,
                        "apply",
                    ),
                    (
                        "SKILL-S8-03-02",
                        "Combustion and Structure of a Flame",
                        "Conditions for combustion, ignition temperature, luminous/non-luminous zones",
                        0.50,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S8-04",
                "Cell - Structure and Functions",
                "Plant vs animal cells, nucleus, cytoplasm, cell membrane, organelles",
                [
                    (
                        "SKILL-S8-04-01",
                        "Comparison of Plant and Animal Cells",
                        "Chloroplasts, cell wall, vacuoles, and nuclear membrane differences",
                        0.55,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-S8-05",
                "Force, Pressure and Sound",
                "Contact/non-contact forces, atmospheric pressure, sound propagation, amplitude, frequency",
                [
                    (
                        "SKILL-S8-05-01",
                        "Pressure Calculation and Liquid Pressure",
                        "Formula P = Force / Area and depth-pressure relationship",
                        0.55,
                        "apply",
                    ),
                    (
                        "SKILL-S8-05-02",
                        "Sound Wave Characteristics: Pitch & Loudness",
                        "Relating amplitude to loudness and frequency to pitch",
                        0.55,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S8-06",
                "Light and Optical Phenomena",
                "Laws of reflection, regular vs diffused reflection, human eye, kaleidoscope",
                [
                    (
                        "SKILL-S8-06-01",
                        "Laws of Reflection & Multiple Reflection",
                        "Angle of incidence = angle of reflection; calculating images in angled mirrors",
                        0.55,
                        "apply",
                    ),
                    (
                        "SKILL-S8-06-02",
                        "Human Eye Anatomy and Defects",
                        "Cornea, iris, pupil, lens, retina; myopia and hypermetropia basics",
                        0.60,
                        "understand",
                    ),
                ],
            ),
        ],
        "social_science": [
            (
                "TOPIC-SST8-01",
                "Modern History: From Trade to Territory",
                "Battle of Plassey, Buxar, Doctrine of Lapse, Subsidiary Alliance",
                [
                    (
                        "SKILL-SST8-01-01",
                        "British Expansion & Annexation Policies",
                        "Evaluating Subsidiary Alliance and Doctrine of Lapse impacts",
                        0.55,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-SST8-02",
                "The Revolt of 1857 & National Movement",
                "Causes of 1857 revolt, leaders, aftermath, Gandhian mass movements",
                [
                    (
                        "SKILL-SST8-02-01",
                        "Causes and Consequences of 1857 Rebellion",
                        "Military, political, socio-religious factors and Crown takeover of 1858",
                        0.55,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-SST8-03",
                "Resources: Land, Soil, Water and Agriculture",
                "Soil erosion, conservation methods, water harvesting, subsistence vs commercial farming",
                [
                    (
                        "SKILL-SST8-03-01",
                        "Soil Conservation and Water Resource Management",
                        "Terrace farming, contour ploughing, shelter belts, and rain harvesting",
                        0.50,
                        "apply",
                    ),
                    (
                        "SKILL-SST8-03-02",
                        "Farming Systems: Subsistence vs Commercial",
                        "Comparing shifting cultivation, intensive subsistence, and plantation crops",
                        0.50,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-SST8-04",
                "The Indian Constitution and Judiciary",
                "Fundamental Rights, secularism, separation of powers, independent judiciary, PIL",
                [
                    (
                        "SKILL-SST8-04-01",
                        "Key Features of Indian Constitution",
                        "Federalism, parliamentary form, separation of powers, Fundamental Rights",
                        0.50,
                        "understand",
                    ),
                    (
                        "SKILL-SST8-04-02",
                        "Judiciary Structure and Public Interest Litigation (PIL)",
                        "Supreme Court, High Court, Subordinate Courts, and PIL mechanism",
                        0.55,
                        "understand",
                    ),
                ],
            ),
        ],
        "english": [
            (
                "TOPIC-ENG8-01",
                "Reading Comprehension & Critical Thinking",
                "Evaluating arguments, tone, factual accuracy, and drawing synthesis",
                [
                    (
                        "SKILL-ENG8-01-01",
                        "Critical Analysis & Inference in Texts",
                        "Distinguishing fact from opinion and identifying underlying authorial bias",
                        0.55,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-ENG8-02",
                "Grammar: Reported Speech and Non-Finites",
                "Direct to indirect speech transformations, gerunds, participles, infinitives",
                [
                    (
                        "SKILL-ENG8-02-01",
                        "Direct to Indirect Speech Transformations",
                        "Tense shifting, pronoun changes, and reporting verbs for statements/questions",
                        0.60,
                        "apply",
                    ),
                    (
                        "SKILL-ENG8-02-02",
                        "Infinitives, Gerunds, and Participles",
                        "Identifying and correctly deploying non-finite verb forms in sentences",
                        0.55,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-ENG8-03",
                "Writing: Articles and Speech Writing",
                "Developing persuasive thesis statements, balanced arguments, and calls to action",
                [
                    (
                        "SKILL-ENG8-03-01",
                        "Article and Persuasive Speech Writing",
                        "Organizing structured introductory hooks, evidence paragraphs, and compelling conclusions",
                        0.55,
                        "create",
                    ),
                ],
            ),
        ],
        "hindi": [
            (
                "TOPIC-HIN8-01",
                "व्याकरण: पद-परिचय एवं वाच्य",
                "संज्ञा, सर्वनाम, विशेषण, क्रिया का पद-परिचय; कर्तृवाच्य, कर्मवाच्य, भाववाच्य",
                [
                    (
                        "SKILL-HIN8-01-01",
                        "पदों का व्याकरणिक परिचय (पद-परिचय)",
                        "वाक्य में प्रयुक्त पदों के लिंग, वचन, कारक, काल आदि का उल्लेख करना",
                        0.60,
                        "analyze",
                    ),
                    (
                        "SKILL-HIN8-01-02",
                        "वाच्य परिवर्तन (कर्तृ, कर्म, भाववाच्य)",
                        "कर्तृवाच्य से कर्मवाच्य और भाववाच्य में सही रूपांतरण",
                        0.55,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-HIN8-02",
                "व्याकरण: अलंकार एवं लोकोक्तियाँ",
                "अनुप्रास, यमक, श्लेष, उपमा अलंकार; मुहावरे व लोकोक्तियाँ",
                [
                    (
                        "SKILL-HIN8-02-01",
                        "प्रमुख अलंकारों की पहचान",
                        "काव्य पंक्तियों में शब्दालंकार एवं अर्थालंकार की पहचान",
                        0.55,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-HIN8-03",
                "अपठित बोध एवं विज्ञापन लेखन",
                "अपठित गद्यांश-पद्यांश, उत्पाद व सामाजिक विषयों पर विज्ञापन निर्माण",
                [
                    (
                        "SKILL-HIN8-03-01",
                        "आकर्षक विज्ञापन एवं सूचना लेखन",
                        "सटीक शीर्षक, प्रेरक स्लोगन और प्रारूप के साथ विज्ञापन तैयार करना",
                        0.50,
                        "create",
                    ),
                ],
            ),
        ],
    },
    9: {
        "mathematics": [
            (
                "TOPIC-M9-01",
                "Number Systems & Irrational Numbers",
                "Real numbers, representation on number line, rationalisation of surds",
                [
                    (
                        "SKILL-M9-01-01",
                        "Rationalisation of Radical Denominators",
                        "Multiplying by conjugate radical to simplify 1 / (sqrt(a) + sqrt(b))",
                        0.60,
                        "apply",
                    ),
                    (
                        "SKILL-M9-01-02",
                        "Laws of Exponents for Real Numbers",
                        "Simplifying expressions using fractional and negative exponents",
                        0.55,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M9-02",
                "Polynomials & Remainder Theorem",
                "Zeroes of polynomials, Factor Theorem, algebraic identities",
                [
                    (
                        "SKILL-M9-02-01",
                        "Factor Theorem & Factorising Cubic Polynomials",
                        "Testing factors and long division / grouping for cubic equations",
                        0.65,
                        "apply",
                    ),
                    (
                        "SKILL-M9-02-02",
                        "Special Algebraic Identities (Cubes & Three Variables)",
                        "Using (a+b+c)^2, (a+b)^3, and a^3+b^3+c^3 - 3abc identities",
                        0.65,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M9-03",
                "Coordinate Geometry & Linear Equations in Two Variables",
                "Cartesian plane, plotting coordinates, ax + by + c = 0, graph plotting",
                [
                    (
                        "SKILL-M9-03-01",
                        "Plotting Points on Cartesian Plane & Quadrants",
                        "Identifying abscissa, ordinate, signs in four quadrants",
                        0.45,
                        "understand",
                    ),
                    (
                        "SKILL-M9-03-02",
                        "Graphing Linear Equations in Two Variables",
                        "Finding solutions and drawing straight-line graphs",
                        0.55,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M9-04",
                "Lines, Angles and Triangles (Congruence)",
                "Axioms, SAS, ASA, SSS, RHS congruence criteria, inequalities in triangles",
                [
                    (
                        "SKILL-M9-04-01",
                        "Triangle Congruence Criteria Proofs",
                        "Applying SAS, ASA, SSS, and RHS to establish geometric congruence",
                        0.65,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-M9-05",
                "Quadrilaterals and Circles",
                "Mid-point theorem, cyclic quadrilaterals, angle subtended by chord at centre",
                [
                    (
                        "SKILL-M9-05-01",
                        "Mid-Point Theorem Applications",
                        "Proving segments parallel and half length of opposite side",
                        0.65,
                        "apply",
                    ),
                    (
                        "SKILL-M9-05-02",
                        "Circle Theorems: Chords and Angles Subtended",
                        "Angle at centre is double angle at circumference; cyclic quadrilateral sum = 180",
                        0.70,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M9-06",
                "Heron's Formula & Surface Areas and Volumes",
                "Heron's formula for irregular triangles, surface area/volume of sphere, hemisphere, cone",
                [
                    (
                        "SKILL-M9-06-01",
                        "Area Calculation by Heron's Formula",
                        "Using s = (a+b+c)/2 and A = sqrt(s(s-a)(s-b)(s-c))",
                        0.60,
                        "apply",
                    ),
                    (
                        "SKILL-M9-06-02",
                        "Surface Area and Volume of Cones and Spheres",
                        "Computing CSA, TSA, and volume for right circular cones and spheres",
                        0.65,
                        "apply",
                    ),
                ],
            ),
        ],
        "science": [
            (
                "TOPIC-S9-01",
                "Matter in Our Surroundings & Solutions",
                "States of matter, latent heat, evaporation, solutions, colloids, suspensions",
                [
                    (
                        "SKILL-S9-01-01",
                        "Latent Heat and Evaporation Factors",
                        "Latent heat of fusion/vaporization, cooling effect of evaporation",
                        0.55,
                        "understand",
                    ),
                    (
                        "SKILL-S9-01-02",
                        "True Solutions, Colloids, and Suspensions",
                        "Tyndall effect, particle size, and stability comparison",
                        0.50,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-S9-02",
                "Atoms, Molecules and Atomic Structure",
                "Law of conservation of mass, mole concept, Dalton's theory, Bohr's model, isotopes",
                [
                    (
                        "SKILL-S9-02-01",
                        "Writing Chemical Formulae & Molecular Mass",
                        "Combining valencies/ions to write correct ionic/covalent formulas",
                        0.60,
                        "apply",
                    ),
                    (
                        "SKILL-S9-02-02",
                        "Atomic Structure: Electrons, Protons, Neutrons, Isotopes",
                        "Electronic configuration, valency electrons, and isotopic applications",
                        0.60,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S9-03",
                "The Fundamental Unit of Life: Cell & Tissues",
                "Plasma membrane, osmosis, organelles, plant vs animal tissues (meristematic, xylem, phloem)",
                [
                    (
                        "SKILL-S9-03-01",
                        "Osmosis, Diffusion, and Cell Organelles",
                        "Hypotonic/hypertonic/isotonic solutions; mitochondria, endoplasmic reticulum",
                        0.55,
                        "apply",
                    ),
                    (
                        "SKILL-S9-03-02",
                        "Plant & Animal Tissues Differentiation",
                        "Meristematic vs permanent plant tissues; epithelial, muscular, nervous animal tissues",
                        0.60,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-S9-04",
                "Motion: Kinematics and Equations of Motion",
                "Distance, displacement, velocity, acceleration, v = u + at, s = ut + 1/2 at^2, v^2 = u^2 + 2as",
                [
                    (
                        "SKILL-S9-04-01",
                        "Velocity-Time Graphs & Acceleration",
                        "Calculating acceleration and distance travelled from v-t graphs",
                        0.65,
                        "apply",
                    ),
                    (
                        "SKILL-S9-04-02",
                        "Three Equations of Uniformly Accelerated Motion",
                        "Solving numericals using kinematics equations",
                        0.70,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-S9-05",
                "Force, Laws of Motion and Gravitation",
                "Newton's three laws of motion, inertia, momentum conservation, Universal Law of Gravitation",
                [
                    (
                        "SKILL-S9-05-01",
                        "Newton's Laws of Motion & Momentum Conservation",
                        "Formula F = ma and momentum conservation in collisions",
                        0.65,
                        "apply",
                    ),
                    (
                        "SKILL-S9-05-02",
                        "Universal Gravitation and Acceleration due to Gravity (g)",
                        "Formula F = G*m1*m2/d^2 and mass vs weight distinction",
                        0.60,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-S9-06",
                "Work, Energy and Sound",
                "Work done W = F*s, kinetic/potential energy, conservation of energy, sound reflection, echo",
                [
                    (
                        "SKILL-S9-06-01",
                        "Kinetic, Potential Energy & Work-Energy Theorem",
                        "Formulas KE = 1/2 mv^2, PE = mgh and total mechanical energy conservation",
                        0.65,
                        "apply",
                    ),
                    (
                        "SKILL-S9-06-02",
                        "Echo, Reverberation, and Ultrasound Applications",
                        "Calculating distance to reflecting surface and SONAR technology",
                        0.60,
                        "apply",
                    ),
                ],
            ),
        ],
        "social_science": [
            (
                "TOPIC-SST9-01",
                "The French Revolution & Russian Revolution",
                "Causes of French revolution, Estates General, Reign of Terror, Bolsheviks, Lenin",
                [
                    (
                        "SKILL-SST9-01-01",
                        "Causes and Impact of the French Revolution",
                        "Three Estates, storming of Bastille, Declaration of Rights of Man",
                        0.55,
                        "understand",
                    ),
                    (
                        "SKILL-SST9-01-02",
                        "Russian Revolution & Rise of Socialism",
                        "Tsarist autocracy, 1917 February and October revolutions, Lenin's April Theses",
                        0.60,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-SST9-02",
                "India: Physical Features & Drainage",
                "Himalayas, Northern Plains, Peninsular Plateau, Coastal Plains, Indus, Ganga, Brahmaputra",
                [
                    (
                        "SKILL-SST9-02-01",
                        "Physiographic Divisions of India",
                        "Geological formation and characteristics of Himalayas and Peninsular Plateau",
                        0.55,
                        "understand",
                    ),
                    (
                        "SKILL-SST9-02-02",
                        "Himalayan vs Peninsular River Systems",
                        "Perennial vs seasonal flow, drainage patterns (dendritic, radial)",
                        0.55,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-SST9-03",
                "Democratic Politics & Electoral System",
                "Definition of democracy, Indian Constitution assembly, free and fair elections, voter rights",
                [
                    (
                        "SKILL-SST9-03-01",
                        "Features of Democracy & Constitutional Design",
                        "Why democracy? Rule of law, role of Election Commission, Model Code of Conduct",
                        0.50,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-SST9-04",
                "Economics: People as Resource & Poverty",
                "Human capital formation, education, health, unemployment types, poverty line estimation",
                [
                    (
                        "SKILL-SST9-04-01",
                        "Human Capital Formation & Economic Activities",
                        "Primary, secondary, tertiary sectors; disguised and seasonal unemployment",
                        0.50,
                        "understand",
                    ),
                    (
                        "SKILL-SST9-04-02",
                        "Poverty Estimation and Anti-Poverty Schemes",
                        "Poverty line indicators and government schemes (MGNREGA)",
                        0.50,
                        "understand",
                    ),
                ],
            ),
        ],
        "english": [
            (
                "TOPIC-ENG9-01",
                "Reading Comprehension: Discursive & Analytical",
                "Inferring complex motifs, rhetorical devices, and comparing dual perspectives",
                [
                    (
                        "SKILL-ENG9-01-01",
                        "Discursive Passage Evaluation & Argument Extraction",
                        "Synthesizing disparate points of view and drawing evidence-based conclusions",
                        0.60,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-ENG9-02",
                "Grammar: Reported Speech, Modals & Determiners",
                "Imperative/interrogative indirect speech, few/little/much/many determiners",
                [
                    (
                        "SKILL-ENG9-02-01",
                        "Reported Speech: Commands, Requests, Questions",
                        "Transforming imperative and wh-/yes-no questions into indirect form",
                        0.65,
                        "apply",
                    ),
                    (
                        "SKILL-ENG9-02-02",
                        "Determiners and Quantifiers",
                        "Accurate usage of each, every, either, neither, much, many, few, little",
                        0.55,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-ENG9-03",
                "Writing: Descriptive Paragraph & Story Writing",
                "Event descriptions, character sketches, and creative narrative arcs",
                [
                    (
                        "SKILL-ENG9-03-01",
                        "Descriptive Paragraph & Story Composition",
                        "Crafting sensory details, narrative flow, and resolved plots",
                        0.60,
                        "create",
                    ),
                ],
            ),
        ],
        "hindi": [
            (
                "TOPIC-HIN9-01",
                "व्याकरण: उपसर्ग, प्रत्यय एवं समास",
                "तत्सम/तद्भव उपसर्ग, कृत/तद्धित प्रत्यय, तत्पुरुष, द्विगु, बहुव्रीहि समास",
                [
                    (
                        "SKILL-HIN9-01-01",
                        "उपसर्ग एवं प्रत्यय से शब्द निर्माण",
                        "मूल शब्द और उपसर्ग/प्रत्यय को अलग करना एवं नवीन शब्दों का निर्माण",
                        0.50,
                        "apply",
                    ),
                    (
                        "SKILL-HIN9-01-02",
                        "द्विगु, द्वंद्व एवं बहुव्रीहि समास",
                        "विग्रह और समास के सटीक भेद की पहचान",
                        0.55,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-HIN9-02",
                "व्याकरण: अर्थ की दृष्टि से वाक्य भेद",
                "विधानवाचक, निषेधवाचक, प्रश्नवाचक, आज्ञावाचक, विस्मयादिबोधक आदि 8 भेद",
                [
                    (
                        "SKILL-HIN9-02-01",
                        "वाक्य भेदों की पहचान एवं रूपांतरण",
                        "अर्थ के आधार पर वाक्य के 8 भेदों की पहचान और परस्पर रूपांतरण",
                        0.55,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-HIN9-03",
                "व्याकरण: अलंकार एवं रचनात्मक लेखन",
                "अनुप्रास, यमक, उपमा, रूपक अलंकार, लघुकथा लेखन, ईमेल लेखन",
                [
                    (
                        "SKILL-HIN9-03-01",
                        "काव्य पंक्तियों में अलंकारों की पहचान",
                        "उपमा और रूपक, अनुप्रास और यमक के बीच सूक्ष्म भेद की पहचान",
                        0.60,
                        "analyze",
                    ),
                    (
                        "SKILL-HIN9-03-02",
                        "लघुकथा एवं ईमेल लेखन",
                        "दी गई रूपरेखा के आधार पर प्रभावी लघुकथा और औपचारिक ईमेल तैयार करना",
                        0.55,
                        "create",
                    ),
                ],
            ),
        ],
    },
    10: {
        "mathematics": [
            (
                "TOPIC-M10-01",
                "Real Numbers & Fundamental Theorem of Arithmetic",
                "Euclid's division lemma, irrationality proofs for sqrt(2), sqrt(3), terminating decimals",
                [
                    (
                        "SKILL-M10-01-01",
                        "Proof of Irrationality for Radicals",
                        "Proof by contradiction that sqrt(p) is irrational",
                        0.65,
                        "analyze",
                    ),
                    (
                        "SKILL-M10-01-02",
                        "HCF and LCM via Fundamental Theorem of Arithmetic",
                        "Expressing integers as product of primes and verifying HCF * LCM = a * b",
                        0.55,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M10-02",
                "Polynomials & Quadratic Equations",
                "Zeroes relationship to coefficients, quadratic formula x = (-b +- sqrt(D))/2a, nature of roots",
                [
                    (
                        "SKILL-M10-02-01",
                        "Relationship Between Zeroes & Coefficients",
                        "Sum alpha+beta = -b/a and product alpha*beta = c/a",
                        0.60,
                        "apply",
                    ),
                    (
                        "SKILL-M10-02-02",
                        "Quadratic Formula and Discriminant (Nature of Roots)",
                        "Evaluating D = b^2 - 4ac for real/equal/distinct/imaginary roots",
                        0.65,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M10-03",
                "Pair of Linear Equations in Two Variables",
                "Graphical method, substitution, elimination, consistency conditions",
                [
                    (
                        "SKILL-M10-03-01",
                        "Consistency Conditions: Intersecting, Parallel, Coincident",
                        "Testing a1/a2, b1/b2, c1/c2 ratios for unique/no/infinite solutions",
                        0.55,
                        "apply",
                    ),
                    (
                        "SKILL-M10-03-02",
                        "Elimination & Substitution Methods",
                        "Solving algebraic simultaneous equations and speed-distance word problems",
                        0.65,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M10-04",
                "Arithmetic Progressions (AP)",
                "General term a_n = a + (n-1)d, sum of n terms S_n = n/2 [2a + (n-1)d]",
                [
                    (
                        "SKILL-M10-04-01",
                        "Finding nth Term of Arithmetic Progression",
                        "Formula a_n = a + (n-1)d and finding terms from end",
                        0.60,
                        "apply",
                    ),
                    (
                        "SKILL-M10-04-02",
                        "Sum of First n Terms of an AP",
                        "Applying S_n formulas to solve real-world series problems",
                        0.65,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M10-05",
                "Triangles: Similarity and Thales Theorem",
                "Basic Proportionality Theorem (BPT), AAA, SSS, SAS similarity criteria",
                [
                    (
                        "SKILL-M10-05-01",
                        "Basic Proportionality Theorem (Thales) Applications",
                        "Proving line parallel to one side divides others in same ratio",
                        0.70,
                        "apply",
                    ),
                    (
                        "SKILL-M10-05-02",
                        "Criteria for Similarity of Triangles (AAA, SSS, SAS)",
                        "Establishing geometric similarity and finding missing segment lengths",
                        0.65,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-M10-06",
                "Coordinate Geometry & Trigonometry",
                "Distance formula, section formula, trig ratios, trig identities sin^2 + cos^2 = 1, heights & distances",
                [
                    (
                        "SKILL-M10-06-01",
                        "Distance and Section Formulas",
                        "Finding distance between points and internal division ratio m1:m2",
                        0.60,
                        "apply",
                    ),
                    (
                        "SKILL-M10-06-02",
                        "Trigonometric Ratios and Standard Values (0, 30, 45, 60, 90)",
                        "Evaluating trigonometric expressions with standard angle tables",
                        0.60,
                        "apply",
                    ),
                    (
                        "SKILL-M10-06-03",
                        "Trigonometric Identities & Heights and Distances",
                        "Proving identities and solving angle of elevation/depression problems",
                        0.75,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-M10-07",
                "Surface Areas, Volumes and Statistics/Probability",
                "Frustum, combined solid shapes, mean (step deviation), median, mode, classical probability",
                [
                    (
                        "SKILL-M10-07-01",
                        "Surface Area and Volume of Combined Solids",
                        "Cylinder with hemispherical ends, cone mounted on hemisphere",
                        0.70,
                        "apply",
                    ),
                    (
                        "SKILL-M10-07-02",
                        "Mean, Median, and Mode of Grouped Data",
                        "Applying assumed mean method and mode formula for grouped frequencies",
                        0.65,
                        "apply",
                    ),
                    (
                        "SKILL-M10-07-03",
                        "Classical Probability of Events",
                        "Calculating probability of cards, dice, coins, and complementary events P(E) + P(not E) = 1",
                        0.55,
                        "apply",
                    ),
                ],
            ),
        ],
        "science": [
            (
                "TOPIC-S10-01",
                "Chemical Reactions, Acids, Bases & Metals",
                "Balancing chemical equations, redox, indicators, pH scale, metallurgy, reactivity",
                [
                    (
                        "SKILL-S10-01-01",
                        "Balancing Chemical Equations & Types of Reactions",
                        "Combination, decomposition, displacement, double displacement, redox",
                        0.60,
                        "apply",
                    ),
                    (
                        "SKILL-S10-01-02",
                        "pH Scale, Neutralization, and Common Salts",
                        "Bleaching powder, baking soda, washing soda, Plaster of Paris",
                        0.60,
                        "understand",
                    ),
                    (
                        "SKILL-S10-01-03",
                        "Metallurgy and Corrosion Prevention",
                        "Roasting, calcination, electrolytic refining, and galvanisation",
                        0.65,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S10-02",
                "Carbon and Its Compounds",
                "Covalent bonding, catenation, homologous series, functional groups, saponification",
                [
                    (
                        "SKILL-S10-02-01",
                        "Covalent Bonding and Versatile Nature of Carbon",
                        "Tetravalency and catenation explaining vast array of organic compounds",
                        0.65,
                        "understand",
                    ),
                    (
                        "SKILL-S10-02-02",
                        "Homologous Series & IUPAC Nomenclature",
                        "Naming alkanes, alkenes, alkynes, alcohols, aldehydes, ketones, carboxylic acids",
                        0.70,
                        "apply",
                    ),
                    (
                        "SKILL-S10-02-03",
                        "Combustion, Oxidation, Esterification and Saponification",
                        "Chemical reactions of ethanol and ethanoic acid; cleansing action of soaps",
                        0.70,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-S10-03",
                "Life Processes: Nutrition, Respiration, Transport, Excretion",
                "Autotrophic/heterotrophic, double circulation in humans, nephron structure in kidneys",
                [
                    (
                        "SKILL-S10-03-01",
                        "Human Circulatory System & Double Circulation",
                        "Functioning of heart chambers, arteries, veins, capillaries, blood pressure",
                        0.65,
                        "understand",
                    ),
                    (
                        "SKILL-S10-03-02",
                        "Excretory System & Nephron Functioning",
                        "Glomerular filtration, selective reabsorption, and urine formation",
                        0.65,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S10-04",
                "Control and Coordination & Reproduction",
                "Nervous system, reflex arc, endocrine glands, asexual/sexual reproduction, contraception",
                [
                    (
                        "SKILL-S10-04-01",
                        "Neuron Structure, Reflex Arc & Plant Hormones",
                        "Synapse transmission; auxin, gibberellin, cytokinin, abscisic acid",
                        0.60,
                        "understand",
                    ),
                    (
                        "SKILL-S10-04-02",
                        "Human Reproductive Systems & Contraceptive Methods",
                        "Male/female anatomy, fertilization, menstruation cycle, barrier/chemical methods",
                        0.60,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S10-05",
                "Heredity and Evolution",
                "Mendel's monohybrid and dihybrid crosses, sex determination in humans",
                [
                    (
                        "SKILL-S10-05-01",
                        "Mendel's Laws of Inheritance (3:1 and 9:3:3:1 Ratios)",
                        "Dominant vs recessive traits, genotype vs phenotype",
                        0.65,
                        "apply",
                    ),
                    (
                        "SKILL-S10-05-02",
                        "Sex Determination in Human Beings",
                        "XX vs XY chromosomal mechanism and 50% probability",
                        0.55,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S10-06",
                "Optics: Reflection, Refraction, Lenses & Human Eye",
                "Mirror/lens formula, magnification, power of lens P = 1/f, dispersion, scattering",
                [
                    (
                        "SKILL-S10-06-01",
                        "Mirror and Lens Formulas & Magnification",
                        "Using 1/v +- 1/u = 1/f with Cartesian sign convention",
                        0.70,
                        "apply",
                    ),
                    (
                        "SKILL-S10-06-02",
                        "Refraction Through Prism, Dispersion, and Tyndall Scattering",
                        "Formation of rainbow, atmospheric refraction (twinkling of stars), blue sky",
                        0.60,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-S10-07",
                "Electricity and Magnetic Effects of Current",
                "Ohm's law V = IR, series/parallel combinations, Joule's heating, magnetic field, Fleming's rules",
                [
                    (
                        "SKILL-S10-07-01",
                        "Ohm's Law, Resistance and Equivalent Resistors",
                        "Series R_eq = R1+R2 and parallel 1/R_eq = 1/R1 + 1/R2 combinations",
                        0.70,
                        "apply",
                    ),
                    (
                        "SKILL-S10-07-02",
                        "Electric Power and Commercial Unit of Energy",
                        "Formulas P = VI = I^2 R = V^2 / R and 1 kWh = 3.6 * 10^6 J",
                        0.65,
                        "apply",
                    ),
                    (
                        "SKILL-S10-07-03",
                        "Magnetic Field Patterns & Fleming's Left-Hand Rule",
                        "Solenoid magnetic field, force on current-carrying conductor, electric motor principle",
                        0.70,
                        "apply",
                    ),
                ],
            ),
        ],
        "social_science": [
            (
                "TOPIC-SST10-01",
                "The Rise of Nationalism in Europe & India",
                "French Revolution symbols, unification of Italy/Germany, Non-Cooperation, Civil Disobedience",
                [
                    (
                        "SKILL-SST10-01-01",
                        "Nationalism in Europe: Unification of Germany and Italy",
                        "Role of Bismarck, Cavour, Garibaldi, and romantic nationalism",
                        0.60,
                        "analyze",
                    ),
                    (
                        "SKILL-SST10-01-02",
                        "Indian National Movement: Rowlatt Act to Dandi March",
                        "Non-Cooperation, Civil Disobedience, Simon Commission, Gandhi-Irwin pact",
                        0.60,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-SST10-02",
                "Resources, Agriculture and Manufacturing Industries",
                "Land degradation, crop seasons (Rabi, Kharif, Zaid), major food/cash crops, industrial location",
                [
                    (
                        "SKILL-SST10-02-01",
                        "Agricultural Cropping Patterns & Major Crops in India",
                        "Rice, wheat, millets, cotton, sugarcane climate requirements and distribution",
                        0.55,
                        "understand",
                    ),
                    (
                        "SKILL-SST10-02-02",
                        "Mineral & Energy Resources: Conventional vs Non-Conventional",
                        "Coal, petroleum, solar, wind energy conservation strategies",
                        0.55,
                        "understand",
                    ),
                ],
            ),
            (
                "TOPIC-SST10-03",
                "Democratic Politics: Federalism & Political Parties",
                "Union, State, Concurrent lists, decentralization in India (1992 amendment), party systems",
                [
                    (
                        "SKILL-SST10-03-01",
                        "Federal Power Sharing in India",
                        "Three-fold legislative distribution and rural/urban local self-government",
                        0.60,
                        "understand",
                    ),
                    (
                        "SKILL-SST10-03-02",
                        "Functions and Challenges of Political Parties",
                        "National vs State parties, defection, dynastic succession, money and muscle power",
                        0.55,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-SST10-04",
                "Economics: Money, Credit and Globalisation",
                "Barter system, formal vs informal credit sources, SHGs, MNCs, WTO, trade liberalization",
                [
                    (
                        "SKILL-SST10-04-01",
                        "Formal vs Informal Sources of Credit in India",
                        "Role of RBI, commercial banks vs moneylenders, Self Help Groups (SHGs)",
                        0.55,
                        "understand",
                    ),
                    (
                        "SKILL-SST10-04-02",
                        "Globalisation and Integration of Markets",
                        "MNC operations, foreign direct investment, enabling technology and impacts on workers",
                        0.55,
                        "analyze",
                    ),
                ],
            ),
        ],
        "english": [
            (
                "TOPIC-ENG10-01",
                "Reading Comprehension: Discursive & Case-Based Factual",
                "Synthesizing data graphs, critical appraisal, analyzing nuance and vocabulary in context",
                [
                    (
                        "SKILL-ENG10-01-01",
                        "Case-Based Factual Passage Analysis",
                        "Interpreting visual data, statistical claims, and deducing rigorous factual implications",
                        0.65,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-ENG10-02",
                "Grammar: Advanced Concord, Modals and Reported Speech",
                "Complex subject-verb inversion, nuances of modal auxiliaries, dialogue reporting",
                [
                    (
                        "SKILL-ENG10-02-01",
                        "Complex Dialogue Reporting & Speech Transformations",
                        "Converting nested conversational dialogues into correct indirect discourse",
                        0.70,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-ENG10-03",
                "Writing Skills: Analytical Paragraph & Formal Letters",
                "Analyzing trends, bar graphs, survey data; letters of order, enquiry, editorial",
                [
                    (
                        "SKILL-ENG10-03-01",
                        "Analytical Paragraph Writing Based on Charts/Data",
                        "Comparing statistical trends, contrasting peaks/troughs, and formulating objective summaries",
                        0.65,
                        "create",
                    ),
                ],
            ),
        ],
        "hindi": [
            (
                "TOPIC-HIN10-01",
                "व्याकरण: रचना के आधार पर वाक्य रूपांतरण",
                "सरल वाक्य, संयुक्त वाक्य और मिश्र वाक्य की पहचान एवं परस्पर रूपांतरण",
                [
                    (
                        "SKILL-HIN10-01-01",
                        "सरल, संयुक्त एवं मिश्र वाक्य का रूपांतरण",
                        "समुच्चयबोधक अव्ययों के प्रयोग से वाक्यों का सटीक संश्लेषण व विश्लेषण",
                        0.65,
                        "apply",
                    ),
                ],
            ),
            (
                "TOPIC-HIN10-02",
                "व्याकरण: वाच्य, पद-परिचय और अलंकार",
                "वाच्य, विकारी-अविकारी पदों का परिचय; श्लेष, उत्प्रेक्षा, अतिशयोक्ति, मानवीकरण",
                [
                    (
                        "SKILL-HIN10-02-01",
                        "उत्प्रेक्षा, अतिशयोक्ति एवं मानवीकरण अलंकार",
                        "काव्य पंक्तियों में उपमेय-उपमान संभावना और मानवीकरण की सटीक पहचान",
                        0.65,
                        "analyze",
                    ),
                ],
            ),
            (
                "TOPIC-HIN10-03",
                "रचनात्मक लेखन: अनुच्छेद, स्ववृत्त व संदेश लेखन",
                "समसामयिक अनुच्छेद, बायोडाटा (स्ववृत्त) लेखन, औपचारिक शुभकामना/शोक संदेश",
                [
                    (
                        "SKILL-HIN10-03-01",
                        "स्ववृत्त (Resume) एवं औपचारिक संदेश लेखन",
                        "मानक प्रारूप के अनुसार शैक्षणिक योग्यता, कार्य अनुभव और व्यक्तिगत विवरण का प्रस्तुतीकरण",
                        0.60,
                        "create",
                    ),
                ],
            ),
        ],
    },
}


def generate_sample_questions_for_skill(
    skill_code: str, skill_name: str, topic_name: str, subject: str, grade: int
) -> list[dict]:
    """Generate calibrated bilingual NCERT diagnostic questions for any competency node."""
    return [
        {
            "code": f"Q-{skill_code}-01",
            "difficulty": 2,
            "question_type": "mcq",
            "en_prompt": f"Which of the following statements correctly exemplifies the core principle of '{skill_name}' in Class {grade} {subject.replace('_', ' ').title()}?",
            "hi_prompt": f"कक्षा {grade} {subject} के संदर्भ में '{skill_name}' के मूल सिद्धांत को निम्नलिखित में से कौन-सा विकल्प सही रूप से दर्शाता है?",
            "options": [
                {
                    "id": "A",
                    "text": f"It establishes the fundamental conceptual basis of {topic_name} according to standard NCERT rules.",
                    "is_correct": True,
                },
                {
                    "id": "B",
                    "text": "It applies only in rare hypothetical cases without real-world significance.",
                    "is_correct": False,
                },
                {
                    "id": "C",
                    "text": "It represents an outdated convention that has been superseded.",
                    "is_correct": False,
                },
                {
                    "id": "D",
                    "text": "It requires memorizing arbitrary constants without structural logical derivation.",
                    "is_correct": False,
                },
            ],
            "explanation": f"According to the NCERT Class {grade} curriculum, '{skill_name}' forms an essential prerequisite competency for understanding {topic_name}.",
            "hints": [
                f"Recall the foundational definitions discussed in the NCERT textbook under {topic_name}.",
                f"Look for the option that emphasizes the universal rule governing {skill_name}.",
                "Option A captures the authentic pedagogical definition specified in NCERT benchmarks.",
            ],
        },
        {
            "code": f"Q-{skill_code}-02",
            "difficulty": 4,
            "question_type": "mcq",
            "en_prompt": f"When solving an applied problem involving '{skill_name}', what is the crucial analytical step required to avoid common miscalculations?",
            "hi_prompt": f"'{skill_name}' से संबंधित व्यावहारिक प्रश्न हल करते समय सामान्य त्रुटियों से बचने के लिए सबसे महत्वपूर्ण विश्लेषणात्मक चरण क्या है?",
            "options": [
                {
                    "id": "A",
                    "text": "Skipping intermediate simplification and guessing based on intuition.",
                    "is_correct": False,
                },
                {
                    "id": "B",
                    "text": "Strictly verifying boundary conditions and applying inverse balance operations sequentially.",
                    "is_correct": True,
                },
                {
                    "id": "C",
                    "text": "Ignoring units of measurement and focusing solely on integer digits.",
                    "is_correct": False,
                },
                {
                    "id": "D",
                    "text": "Changing the signs arbitrarily across operations.",
                    "is_correct": False,
                },
            ],
            "explanation": f"In {topic_name}, careful verification of step-by-step balance and consistent application of rules ensures cognitive mastery.",
            "hints": [
                "Consider which approach follows the scientific / mathematical problem-solving methodology.",
                "Systematic verification of intermediate steps prevents computational and conceptual errors.",
                "Option B follows the verified NCERT rubric.",
            ],
        },
    ]


async def seed_all_curricula() -> None:
    print("--> Initializing Database Connection & Table Invariants...", flush=True)
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = get_session_factory()
    async with session_factory() as session:
        print("--> Pre-fetching existing curriculum database entities...", flush=True)
        # Prefetch to eliminate thousands of network round-trips
        currs_res = await session.execute(select(Curriculum))
        existing_currs = {c.code: c for c in currs_res.scalars().all()}

        topics_res = await session.execute(select(Topic))
        existing_topics = {(t.curriculum_id, t.code): t for t in topics_res.scalars().all()}

        skills_res = await session.execute(select(Skill))
        existing_skills = {s.code: s for s in skills_res.scalars().all()}

        questions_res = await session.execute(select(Question))
        existing_questions = {q.code: q for q in questions_res.scalars().all()}

        prereqs_res = await session.execute(select(Prerequisite))
        existing_prereqs = {
            (p.parent_skill_id, p.child_skill_id) for p in prereqs_res.scalars().all()
        }

        total_curricula_created = 0
        total_topics_created = 0
        total_skills_created = 0
        total_questions_created = 0
        total_questions_updated = 0

        for grade, subjects_dict in NCERT_DATA.items():
            for subject, topics_list in subjects_dict.items():
                curriculum_code = f"NCERT-{subject[:4].upper()}-C{grade}"
                print(
                    f"--> Seeding Grade {grade} {subject.title()} ({curriculum_code})...",
                    flush=True,
                )

                # 1. Upsert Curriculum
                curr = existing_currs.get(curriculum_code)
                if curr:
                    curr.grade = grade
                    curr.subject = subject
                    curr.board = "NCERT"
                    curr.version = "2024-2025"
                else:
                    curr = Curriculum(
                        id=uuid.uuid4(),
                        code=curriculum_code,
                        board="NCERT",
                        grade=grade,
                        subject=subject,
                        version="2024-2025",
                    )
                    session.add(curr)
                    existing_currs[curriculum_code] = curr
                    total_curricula_created += 1

                await session.flush()

                # 2. Iterate Topics
                for seq_idx, (t_code, t_name, t_desc, skills_list) in enumerate(
                    topics_list, start=1
                ):
                    topic_key = (curr.id, t_code)
                    topic = existing_topics.get(topic_key)

                    if topic:
                        topic.name = t_name
                        topic.description = t_desc
                        topic.sequence_order = seq_idx
                    else:
                        topic = Topic(
                            id=uuid.uuid4(),
                            curriculum_id=curr.id,
                            code=t_code,
                            name=t_name,
                            description=t_desc,
                            sequence_order=seq_idx,
                        )
                        session.add(topic)
                        existing_topics[topic_key] = topic
                        total_topics_created += 1

                    await session.flush()

                    # 3. Iterate Skills
                    prev_skill_id = None
                    for sk_code, sk_name, sk_desc, diff, blooms in skills_list:
                        skill = existing_skills.get(sk_code)

                        if skill:
                            skill.name = sk_name
                            skill.description = sk_desc
                            skill.difficulty = diff
                            skill.blooms_level = blooms
                        else:
                            skill = Skill(
                                id=uuid.uuid4(),
                                topic_id=topic.id,
                                code=sk_code,
                                name=sk_name,
                                description=sk_desc,
                                difficulty=diff,
                                blooms_level=blooms,
                            )
                            session.add(skill)
                            existing_skills[sk_code] = skill
                            total_skills_created += 1

                        await session.flush()

                        # Link sequential prerequisite DAG edge if within same topic
                        if prev_skill_id and prev_skill_id != skill.id:
                            edge_key = (prev_skill_id, skill.id)
                            if edge_key not in existing_prereqs:
                                session.add(
                                    Prerequisite(
                                        parent_skill_id=prev_skill_id,
                                        child_skill_id=skill.id,
                                        relation_type="hard",
                                    )
                                )
                                existing_prereqs.add(edge_key)

                        prev_skill_id = skill.id

                        # 4. Generate & seed calibrated questions for this skill
                        q_items = generate_authentic_questions_for_skill(
                            skill_code=sk_code,
                            skill_name=sk_name,
                            skill_description=sk_desc,
                            topic_name=t_name,
                            subject=subject,
                            grade=grade,
                        )

                        for q_data in q_items:
                            q_code = q_data["code"]
                            q_obj = existing_questions.get(q_code)
                            if not q_obj:
                                q_id = uuid.uuid4()
                                q_obj = Question(
                                    id=q_id,
                                    code=q_code,
                                    skill_id=skill.id,
                                    difficulty=q_data["difficulty"],
                                    question_type=q_data["question_type"],
                                    status="published",
                                    needs_teacher_review=False,
                                    version=1,
                                )
                                session.add(q_obj)
                                existing_questions[q_code] = q_obj
                                await session.flush()

                                # English Translation
                                q_trans_en = QuestionTranslation(
                                    id=uuid.uuid4(),
                                    question_id=q_obj.id,
                                    language="en",
                                    prompt=q_data["en_prompt"],
                                    options=q_data["options"],
                                    explanation=q_data["explanation"],
                                    hints=q_data["hints"],
                                )

                                # Hindi Translation
                                q_trans_hi = QuestionTranslation(
                                    id=uuid.uuid4(),
                                    question_id=q_obj.id,
                                    language="hi",
                                    prompt=q_data["hi_prompt"],
                                    options=q_data["options"],
                                    explanation=q_data["explanation"],
                                    hints=q_data["hints"],
                                )
                                session.add_all([q_trans_en, q_trans_hi])
                                total_questions_created += 1
                            else:
                                # Update existing question translations with authentic content
                                q_obj.difficulty = q_data["difficulty"]
                                q_obj.question_type = q_data["question_type"]
                                q_obj.status = "published"

                                t_stmt = select(QuestionTranslation).where(
                                    QuestionTranslation.question_id == q_obj.id
                                )
                                trans_list = (await session.execute(t_stmt)).scalars().all()
                                en_found = False
                                hi_found = False
                                for tr in trans_list:
                                    if tr.language == "en":
                                        tr.prompt = q_data["en_prompt"]
                                        tr.options = q_data["options"]
                                        tr.explanation = q_data["explanation"]
                                        tr.hints = q_data["hints"]
                                        session.add(tr)
                                        en_found = True
                                    elif tr.language == "hi":
                                        tr.prompt = q_data["hi_prompt"]
                                        tr.options = q_data["options"]
                                        tr.explanation = q_data["explanation"]
                                        tr.hints = q_data["hints"]
                                        session.add(tr)
                                        hi_found = True

                                if not en_found:
                                    session.add(
                                        QuestionTranslation(
                                            id=uuid.uuid4(),
                                            question_id=q_obj.id,
                                            language="en",
                                            prompt=q_data["en_prompt"],
                                            options=q_data["options"],
                                            explanation=q_data["explanation"],
                                            hints=q_data["hints"],
                                        )
                                    )
                                if not hi_found:
                                    session.add(
                                        QuestionTranslation(
                                            id=uuid.uuid4(),
                                            question_id=q_obj.id,
                                            language="hi",
                                            prompt=q_data["hi_prompt"],
                                            options=q_data["options"],
                                            explanation=q_data["explanation"],
                                            hints=q_data["hints"],
                                        )
                                    )
                                total_questions_updated += 1

                # Commit per subject to keep transactions responsive and durable
                await session.commit()

        print("\n========================================================", flush=True)
        print("--> NCERT CURRICULUM SEEDING COMPLETED SUCCESSFULLY!", flush=True)
        print(
            f"--> Curricula Created/Synced: {total_curricula_created} across Classes 6 to 10",
            flush=True,
        )
        print(f"--> Topics (Chapters) Created/Synced: {total_topics_created}", flush=True)
        print(f"--> Competency Skills Created/Synced: {total_skills_created}", flush=True)
        print(
            f"--> Questions Created: {total_questions_created} | Questions Refreshed with Authentic Content: {total_questions_updated}",
            flush=True,
        )
        print("========================================================\n", flush=True)


if __name__ == "__main__":
    asyncio.run(seed_all_curricula())
