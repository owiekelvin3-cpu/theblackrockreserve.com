/** Curated Unsplash URLs — professional fintech / business imagery */
const u = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=${w}&q=80`;

export const marketingImages = {
  teamHero: u("photo-1521791136064-7986c2920216", 1400),
  officeWide: u("photo-1497366216548-37526070297c", 1400),
  contactHero: u("photo-1556761175-5973dc0f32e7", 1400),
  contactLocation: u("photo-1486406146926-c627a92ad1ab", 1000),
  investmentsHero: u("photo-1579621970563-ebec7560ff3e", 1400),
  analytics: u("photo-1551288049-bebda4e38f71", 900),
  features: {
    banking: u("photo-1601597111158-2fceff292cdc", 900),
    investments: u("photo-1611974789855-9c2a0a7236a3", 900),
    security: u("photo-1563986768609-322da13575f3", 900),
    integration: u("photo-1454165804606-c3d57bc86b40", 900),
    analytics: u("photo-1551288049-bebda4e38f71", 900),
  },
  blog: {
    aiBanking: u("photo-1677442136019-21780ecad995", 800),
    wealth: u("photo-1460925895917-afdab827c52f", 800),
    security: u("photo-1563986768609-322da13575f3", 800),
  },
  portraits: {
    sarah: u("photo-1573496359142-b8d87734a5a2", 200),
    marcus: u("photo-1472099645785-5658abf4ff4e", 200),
    elena: u("photo-1580489944761-15a19d654956", 200),
    james: u("photo-1519085360753-af0119f7cbe7", 200),
    priya: u("photo-1594824476967-48c8b964273f", 200),
    alex: u("photo-1507003211169-0a1dd7228f2d", 200),
    victoria: u("photo-1573497019940-1c28c88b4f3e", 200),
    david: u("photo-1500648767791-00dcc994a43e", 200),
    amara: u("photo-1531123897727-8f129e1688ce", 200),
    robert: u("photo-1560250097-0b93528c311a", 200),
    isabella: u("photo-1508214751196-bcfd4ca60f91", 200),
    thomas: u("photo-1551836022-d5d88e9218df", 200),
    support1: u("photo-1438761681033-6461ffad8d80", 160),
    support2: u("photo-1506794778202-cad84cf45f1d", 160),
    support3: u("photo-1544005313-94ddf0286df2", 160),
    support4: u("photo-1534528741775-53994a69daeb", 160),
    support5: u("photo-1507591064344-4c6ce005b128", 160),
  },
} as const;
