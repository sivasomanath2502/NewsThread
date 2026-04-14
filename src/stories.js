export const stories = [
  {
    id: 1,
    title: 'RBI interest rate update',
    category: 'Finance',
    description: 'How rate changes are affecting markets and everyday borrowers across India.',
    tag: 'Ongoing story',
    readTime: '4 min',
    timeline: [
      { date: 'Jan 1', event: 'Rate increased', details: 'The Reserve Bank raised the policy repo rate by 25 basis points, citing persistent core inflation and global financial tightening.' },
      { date: 'Jan 5', event: 'Markets dropped', details: 'Equity indices fell as investors priced in slower growth; bond yields climbed on expectations of prolonged higher rates.' },
      { date: 'Jan 10', event: 'Inflation report released', details: 'Official data showed headline inflation cooling slightly but remaining above the central bank\'s medium-term target band.' },
      { date: 'Jan 14', event: 'Analyst outlook mixed', details: 'Major brokerages split on whether one more hike is likely or if the cycle has peaked, leaving room for volatility.' },
    ],
    recap: [
      'The RBI increased rates to keep inflation expectations anchored.',
      'Markets reacted with a risk-off tone and higher borrowing costs.',
      'Borrowers and investors are watching the next policy meeting closely.',
    ],
    article: `The latest move by the central bank extends a careful balancing act between growth and price stability. Higher policy rates typically flow through to home loans, car loans, and business credit within weeks, which can slow spending but also help cool demand-driven inflation.

For markets, the immediate read is straightforward: tighter money conditions reduce the appeal of stretched valuations, especially in rate-sensitive sectors such as real estate and consumer durables. At the same time, some investors see the hikes as evidence that policymakers are serious about protecting purchasing power over the long run.

What happens next depends on incoming data—particularly jobs, credit growth, and global commodity prices. Until those signals clarify, expect headlines to swing between "pause" and "one more hike," with both narratives coexisting in the same week.`,
    question: { text: 'What do you think will happen next?', options: ['Market recovers', 'Market falls further', 'Sideways, little change'] },
    simulatedUpdate: {
      actualOutcome: 'Markets recovered: a softer inflation print sparked a relief rally and yields eased from their highs.',
      outcomeSummary: 'Markets recovered',
    },
  },
  {
    id: 2,
    title: 'City transit overhaul',
    category: 'Urban',
    description: 'New lines, delays, and what commuters should expect this year.',
    tag: 'Developing',
    readTime: '3 min',
    timeline: [
      { date: 'Dec 2', event: 'Budget approved', details: 'City council signed off on a multi-year capital plan focused on new metro corridors and bus priority lanes.' },
      { date: 'Dec 18', event: 'Construction starts', details: 'Early works began downtown; several streets moved to single-lane traffic during peak hours.' },
      { date: 'Jan 3', event: 'Commuter complaints rise', details: 'Riders reported longer waits on key bus routes; officials blamed contractor scheduling and holiday staffing gaps.' },
      { date: 'Jan 12', event: 'Pilot smart-ticketing', details: 'A limited trial of contactless fare caps launched on three lines to reduce queue times at stations.' },
    ],
    recap: [
      'A major upgrade to public transit is underway after new funding.',
      'Early disruption is frustrating daily commuters on busy corridors.',
      'Officials promise smoother operations once phased work completes.',
    ],
    article: `Commuters are seeing the familiar pattern of a big infrastructure push: loud construction, rerouted traffic, and schedules that wobble before they stabilize. City leaders argue the short-term pain is the price of a network that can carry more people with fewer cars on the road.

The plan pairs heavy construction with operational tweaks, including bus-only lanes and a gradual shift to simpler fare products. If the pilot programs succeed, riders could spend less time tapping cards and more time relying on predictable headways.

Still, success will hinge on execution—contractor coordination, night-work limits, and honest communication when deadlines slip. For now, the story is less about ribbon-cuttings and more about whether daily travel feels fair while the city is half-built.`,
    question: { text: 'How will this affect your commute?', options: ['Better within a year', 'Worse before it gets better', 'About the same'] },
    simulatedUpdate: {
      actualOutcome: 'Headways stabilized sooner than expected: extra buses on two corridors cut average wait times by double digits.',
      outcomeSummary: 'Commute times improved sooner than expected',
    },
  },
  {
    id: 3,
    title: 'Heatwave early warning',
    category: 'Health',
    description: 'Health advisories and power grid strain as temperatures climb across the region.',
    tag: 'Public health',
    readTime: '3 min',
    timeline: [
      { date: 'Jan 6', event: 'Heat records tied', details: 'Several inland cities matched decade-old temperature highs for the first week of the year.' },
      { date: 'Jan 9', event: 'Advisory issued', details: 'Authorities urged schools to limit outdoor activities and asked employers to offer flexible hours where possible.' },
      { date: 'Jan 11', event: 'Grid peak demand', details: 'Electricity use spiked as air-conditioning load climbed; utilities asked consumers to avoid non-essential usage at dusk.' },
    ],
    recap: [
      'Unseasonal heat is triggering early public-health warnings.',
      'Power demand is rising faster than typical for this month.',
      'Officials are asking for small behavior changes to reduce strain.',
    ],
    article: `Meteorologists describe the pattern as part of a longer trend toward hotter shoulder seasons, when bodies and buildings are not yet acclimated to extreme warmth. Hospitals are watching for dehydration and heat exhaustion, especially among outdoor workers and older adults.

On the infrastructure side, the grid is being tested earlier than usual. Demand management—shifting usage slightly, maintaining backup supplies, and protecting vulnerable neighborhoods from outages—becomes the quiet story behind the temperature maps.

Residents can expect a mix of practical guidance and repeated reminders: hydrate, check on neighbors, and treat heat advisories as more than background noise when planning the day.`,
    question: { text: 'What is your main concern right now?', options: ['Health impacts', 'Power outages', 'Water supply'] },
    simulatedUpdate: {
      actualOutcome: 'Heat peaked mid-week; ER visits for heat illness rose, but the grid held without major outages.',
      outcomeSummary: 'Health impacts spiked; power grid held',
    },
  },

  // ── NEW STORIES ──────────────────────────────────────────────────────────────

  {
    id: 4,
    title: 'India\'s AI policy framework takes shape',
    category: 'Technology',
    description: 'The government unveils draft guidelines for AI governance, safety standards, and startup compliance.',
    tag: 'Policy',
    readTime: '5 min',
    timeline: [
      { date: 'Dec 10', event: 'Draft released', details: 'The Ministry of Electronics and IT published a 42-page consultation document outlining responsibilities for AI developers and deployers operating in India.' },
      { date: 'Dec 20', event: 'Industry responds', details: 'Tech lobbying groups raised concerns that mandatory audits and liability clauses could slow product launches for smaller startups.' },
      { date: 'Jan 4', event: 'Public comment window', details: 'Thousands of submissions received from civil society, academia, and global tech companies; themes around bias, transparency, and enforcement dominated.' },
      { date: 'Jan 15', event: 'Revised draft expected', details: 'Officials signalled a lighter-touch approach for low-risk AI applications while tightening rules around facial recognition and hiring algorithms.' },
    ],
    recap: [
      'India is drafting AI rules that balance innovation with accountability.',
      'Industry fears over-regulation; civil society wants stronger safeguards.',
      'A revised framework focusing on high-risk applications is expected soon.',
    ],
    article: `India's emerging AI governance approach draws on lessons from both Brussels and Silicon Valley, while trying to carve a path suited to a large, developing economy with ambitious digital ambitions. The draft framework categorises AI systems by risk level—a structure borrowed in part from the EU AI Act—but calibrates compliance costs to avoid stifling the country's fast-growing startup ecosystem.

The most contentious provisions concern facial recognition deployed in public spaces and automated decision systems used in credit, employment, and policing. Regulators want mandatory algorithmic impact assessments and the right for affected individuals to seek human review of automated decisions.

For the tech sector, the stakes are significant. India is home to thousands of AI startups and is a major development hub for global technology companies. Getting the rulebook right matters not just domestically but as a signal of what responsible AI governance looks like in the Global South.`,
    question: { text: 'Which matters more for India\'s AI future?', options: ['Strict safety rules first', 'Innovation without friction', 'International alignment'] },
    simulatedUpdate: {
      actualOutcome: 'Revised draft exempted startups under ₹100 crore revenue from full audit requirements, drawing mixed reactions.',
      outcomeSummary: 'Lighter rules for small startups confirmed',
    },
  },

  {
    id: 5,
    title: 'Global food prices climb again',
    category: 'Economy',
    description: 'A new UN report flags rising wheat and edible oil costs, with implications for import-dependent nations.',
    tag: 'Ongoing story',
    readTime: '4 min',
    timeline: [
      { date: 'Nov 28', event: 'UN FAO index rises', details: 'The Food and Agriculture Organisation\'s monthly price index climbed 3.1%, driven by wheat supply uncertainty from the Black Sea region.' },
      { date: 'Dec 12', event: 'Edible oil spike', details: 'Palm and sunflower oil prices jumped after poor harvests in Southeast Asia and continued export restrictions from major producers.' },
      { date: 'Jan 2', event: 'Emerging market pressure', details: 'Countries in South Asia and Sub-Saharan Africa reported foreign exchange strain from rising import bills for staple foods.' },
      { date: 'Jan 8', event: 'G20 emergency call', details: 'Finance ministers from seven nations jointly called for coordinated stock releases and trade facilitation to ease bottlenecks.' },
    ],
    recap: [
      'Global food prices are rising again after a brief period of relief.',
      'Wheat and cooking oil are the main drivers behind the increase.',
      'Poorer import-dependent nations face the sharpest economic pain.',
    ],
    article: `Food inflation has a particular cruelty: it hits hardest the households that spend the largest share of income on eating. When global commodity benchmarks rise, the pain travels fastest to lower-income countries that rely on imports to feed growing urban populations.

The current spike has two distinct drivers. Wheat markets remain sensitive to any disruption in the Black Sea corridor, where weather uncertainty and geopolitical tensions continue to unsettle trading. Meanwhile, edible oil supply chains have not fully recovered from successive weather shocks across major producing regions.

For India—simultaneously a major agricultural producer and a net importer of certain commodities—the picture is mixed. Domestic rice and pulse output has held up, providing some buffer. But cooking oil imports remain expensive, and any pass-through to retail prices is politically sensitive ahead of state election cycles.`,
    question: { text: 'What should governments prioritise?', options: ['Release strategic reserves', 'Negotiate trade deals fast', 'Subsidise retail prices'] },
    simulatedUpdate: {
      actualOutcome: 'Three G20 nations agreed to a coordinated reserve release; edible oil prices eased modestly within two weeks.',
      outcomeSummary: 'Coordinated release softened prices',
    },
  },

  {
    id: 6,
    title: 'The mental health crisis in Indian colleges',
    category: 'Health',
    description: 'A new study reveals one in four students reports significant psychological distress. Universities are scrambling to respond.',
    tag: 'Public health',
    readTime: '5 min',
    timeline: [
      { date: 'Nov 15', event: 'Study published', details: 'Research across 38 universities found 26% of students met criteria for moderate-to-severe anxiety, with engineering and medical colleges showing the highest rates.' },
      { date: 'Dec 1', event: 'Parliamentary debate', details: 'MPs called for mandatory counsellor-to-student ratios; the education ministry acknowledged "significant gaps" in institutional support.' },
      { date: 'Dec 22', event: 'University pledges', details: 'Twelve leading institutions announced new counselling hiring drives and 24-hour helplines before the end of the academic year.' },
      { date: 'Jan 6', event: 'Stigma report', details: 'A follow-up survey found 60% of distressed students avoided seeking help, citing fear of academic consequences and family shame.' },
    ],
    recap: [
      'A quarter of Indian college students show significant mental distress.',
      'Support infrastructure at most universities is severely under-resourced.',
      'Stigma remains the largest barrier to students seeking help.',
    ],
    article: `The data behind the headlines has been building for years. Academic pressure, competitive entrance culture, financial anxiety, and the residual effects of pandemic-era social isolation have combined to produce a mental health burden on campuses that formal support systems were never designed to handle.

Many universities employ a single counsellor for thousands of students, if they employ one at all. Psychiatrists are even rarer. When students in crisis do seek help, they often face long waits, under-trained staff, or institutional responses that prioritise academic standing over wellbeing.

The stigma finding is perhaps the most alarming. A system that students distrust cannot help them. Changing that requires more than hiring counsellors—it requires faculty training, clear confidentiality policies, and a cultural shift in how institutions talk about failure, rest, and asking for support.`,
    question: { text: 'What would most help students right now?', options: ['More counsellors on campus', 'Anonymous digital support', 'Reduced academic pressure'] },
    simulatedUpdate: {
      actualOutcome: 'UGC mandated one counsellor per 1,000 students at all central universities by the next academic year.',
      outcomeSummary: 'Mandatory counsellor ratio announced',
    },
  },

  {
    id: 7,
    title: 'Bengaluru\'s water crisis deepens',
    category: 'Urban',
    description: 'Reservoir levels hit a decade low as the city\'s population growth outpaces water supply infrastructure.',
    tag: 'Developing',
    readTime: '4 min',
    timeline: [
      { date: 'Dec 5', event: 'Reservoir at 30%', details: 'Cauvery basin reservoirs feeding the city dropped to levels not seen since 2012, triggering rationing in outer zones.' },
      { date: 'Dec 19', event: 'Borewells running dry', details: 'Reports emerged of apartment complexes and tech campuses exhausting borewell water, with tanker demand tripling in some districts.' },
      { date: 'Jan 2', event: 'BWSSB emergency plan', details: 'The water utility announced an emergency pipeline augmentation project and imposed fines for non-essential outdoor water use.' },
      { date: 'Jan 11', event: 'Monsoon forecast concern', details: 'Meteorologists warned that a delayed or below-average monsoon could extend the crisis into mid-year, prompting calls for demand-side reform.' },
    ],
    recap: [
      'Bengaluru\'s reservoirs are at critically low levels after a dry year.',
      'Demand far exceeds current supply capacity as the city grows rapidly.',
      'Emergency measures are in place but a sustainable solution remains elusive.',
    ],
    article: `Bengaluru's water problem is, at its core, a planning problem. The city's population has grown from roughly five million to over thirteen million in two decades, but the infrastructure for storing, treating, and distributing water has not kept pace. The result is a city that draws heavily on groundwater, depletes it faster than it recharges, and then turns to expensive tanker supply as a stopgap.

The BWSSB's latest augmentation project will help at the margins, but critics point out that it addresses supply without seriously confronting demand. The technology sector—one of the city's biggest economic draws—consumes enormous quantities of water for cooling, campuses, and residential facilities built for workers.

Climate change compounds the problem. Bengaluru's historically moderate climate, the very quality that attracted millions to the city, is becoming less reliable. Rainfall patterns are shifting, dry spells are longer, and the monsoon is more erratic. Planning for water security now requires assumptions about a future that looks quite different from the past.`,
    question: { text: 'What should be the top priority?', options: ['New reservoirs and pipelines', 'Mandatory rainwater harvesting', 'Relocate water-heavy industry'] },
    simulatedUpdate: {
      actualOutcome: 'The state government approved ₹1,200 crore for a new Cauvery Stage 6 expansion, with completion targeted in 30 months.',
      outcomeSummary: 'Major infrastructure investment approved',
    },
  },

  {
    id: 8,
    title: 'Space debris: Earth\'s growing orbit problem',
    category: 'Science',
    description: 'As satellite launches accelerate, scientists warn that low Earth orbit is approaching a tipping point for collisions.',
    tag: 'Science & Tech',
    readTime: '5 min',
    timeline: [
      { date: 'Nov 20', event: 'ESA collision warning', details: 'The European Space Agency issued its annual debris report, noting that tracked objects in orbit exceeded 35,000 for the first time.' },
      { date: 'Dec 8', event: 'Near-miss incident', details: 'Two decommissioned satellites came within 19 metres of colliding over the South Atlantic, prompting emergency manoeuvres from ground control teams.' },
      { date: 'Dec 28', event: 'International talks stall', details: 'UN-backed negotiations on a binding debris mitigation treaty collapsed after disagreements over enforcement and commercial liability.' },
      { date: 'Jan 10', event: 'De-orbit tech tested', details: 'A joint ESA-JAXA mission successfully tested a drag sail capable of bringing small satellites down from orbit within two years rather than decades.' },
    ],
    recap: [
      'There are now over 35,000 tracked pieces of debris circling Earth.',
      'A near-miss in December highlighted the real collision risk in low orbit.',
      'International rules remain inadequate; new technology offers some hope.',
    ],
    article: `The economics of space launches have changed dramatically. Rockets that once cost hundreds of millions to build now cost a fraction of that, and satellite constellations that were science fiction a decade ago are being assembled at pace. The problem is that the rules governing what happens to satellites when they stop working have not kept up.

Most defunct satellites remain in orbit for years or decades. When a collision occurs—and several have—it creates cascading clouds of smaller fragments that are nearly impossible to track and remove. Scientists call the worst-case scenario Kessler Syndrome: a chain reaction dense enough to make certain orbital bands unusable for generations.

The technology to remove debris exists in prototype form. The harder problem is governance. Who pays to remove a dead satellite that belongs to a company that no longer exists? Who is liable if a derelict satellite damages an active one? These are fundamentally political questions, and the space powers have so far found them too difficult to resolve.`,
    question: { text: 'What is the most urgent need?', options: ['Binding international treaty', 'Commercial de-orbit incentives', 'Pause on new launches'] },
    simulatedUpdate: {
      actualOutcome: 'The drag sail technology was licensed to three commercial operators, making it the first scalable de-orbit solution to reach market.',
      outcomeSummary: 'First commercial de-orbit technology deployed',
    },
  },

  {
    id: 9,
    title: 'Election misinformation: the deepfake election',
    category: 'Politics',
    description: 'AI-generated audio and video are spreading in state election campaigns. How voters and platforms are responding.',
    tag: 'Politics',
    readTime: '5 min',
    timeline: [
      { date: 'Dec 3', event: 'Deepfake ad surfaces', details: 'A fabricated audio clip purporting to be a chief ministerial candidate making inflammatory remarks circulated widely on WhatsApp before being debunked.' },
      { date: 'Dec 14', event: 'Election Commission acts', details: 'The EC issued emergency guidelines requiring political parties to label AI-generated campaign content and mandating platforms to act within 3 hours on flagged material.' },
      { date: 'Dec 28', event: 'Detection challenge', details: 'Independent auditors found that less than 30% of AI-generated content was being correctly labelled, and that detection tools lagged behind generation capabilities.' },
      { date: 'Jan 7', event: 'Parties adapt tactics', details: 'Some campaigns began using deepfakes defensively — pre-debunking expected attacks by publishing real footage as a reference baseline.' },
    ],
    recap: [
      'AI-generated fakes are actively circulating in live election campaigns.',
      'Platform detection and labelling is far behind the pace of creation.',
      'The Election Commission has acted, but enforcement remains patchy.',
    ],
    article: `Elections have always involved distortion—exaggerated promises, misleading attack ads, selectively edited footage. Deepfakes introduce a qualitative shift: fabricated content that is indistinguishable from real footage to an ordinary viewer, produced at near-zero cost, and distributed through networks optimised for emotional engagement over accuracy.

The technology is not new, but its accessibility has crossed a threshold. Tools that once required significant technical skill can now generate convincing audio fakes from a few seconds of real voice recordings. Video synthesis has improved to the point where artifacts that previously gave fakes away are disappearing.

What makes this particularly difficult for democracies is the asymmetry. A deepfake can be created and shared in minutes. Debunking it—producing the evidence, getting the correction to spread as far as the original—takes days, by which point the damage is often done. The challenge is not just technological but social: how do voters learn to be appropriately sceptical without becoming so distrustful that all information feels equally unreliable?`,
    question: { text: 'What is the most effective response?', options: ['Stricter platform regulation', 'Voter media literacy education', 'Mandatory AI content labelling'] },
    simulatedUpdate: {
      actualOutcome: 'Post-election analysis found deepfakes were shared 4x more than corrections, but exit polls showed most voters reported awareness of the problem.',
      outcomeSummary: 'Fakes spread faster than corrections',
    },
  },

  {
    id: 10,
    title: 'India\'s EV transition: progress and potholes',
    category: 'Climate',
    description: 'Sales are up, but grid readiness, battery supply chains, and charging infrastructure lag behind ambition.',
    tag: 'Developing',
    readTime: '4 min',
    timeline: [
      { date: 'Nov 10', event: 'EV sales record', details: 'Monthly passenger EV sales crossed 100,000 units for the first time, with two-wheelers and three-wheelers leading the shift.' },
      { date: 'Nov 30', event: 'Charging gap exposed', details: 'A government audit found only 1 fast charger per 135 EVs in circulation, well below the 1:20 ratio considered adequate for mass adoption.' },
      { date: 'Dec 15', event: 'Battery supply concerns', details: 'Industry groups warned that 85% of lithium-ion cell inputs are imported, making the transition vulnerable to supply chain shocks and currency risk.' },
      { date: 'Jan 5', event: 'FAME III announced', details: 'The government unveiled the third phase of its Faster Adoption and Manufacturing of EVs programme, with ₹10,000 crore allocated through 2027.' },
    ],
    recap: [
      'EV sales in India are growing rapidly, especially in two and three-wheelers.',
      'Charging infrastructure and battery supply chains are serious bottlenecks.',
      'Government funding is increasing but structural gaps remain to be solved.',
    ],
    article: `India's electric vehicle story is one of genuine momentum constrained by genuine structural challenges. The sales numbers are real—millions of two and three-wheelers have already made the switch, and passenger car adoption is accelerating from a smaller base. But the infrastructure and supply chain behind those numbers is thinner than the headline figures suggest.

The charging gap is perhaps the most immediate barrier for passenger vehicles. Range anxiety is not irrational when public fast chargers are scarce. The pattern so far has been that urban and highway charging develops first, leaving rural and secondary city markets behind—the mirror image of how mobile broadband rollout played out a decade ago.

Battery supply chain dependency is a longer-run strategic question. India does not currently mine or process significant quantities of lithium, cobalt, or the other materials needed for battery cells at scale. Domestic cell manufacturing is embryonic. This leaves the transition vulnerable to the same import dependency the country is trying to escape in oil, just shifted to different commodities.`,
    question: { text: 'What is the biggest barrier to EV adoption?', options: ['Too few charging stations', 'High upfront vehicle cost', 'Unreliable power grid'] },
    simulatedUpdate: {
      actualOutcome: 'Two major domestic battery manufacturers announced gigafactory investments totalling ₹8,000 crore, reducing projected import dependency by 2027.',
      outcomeSummary: 'Domestic battery manufacturing investment confirmed',
    },
  },
]
