import { EventTier, PrismaClient, SpaceRole, SpaceType } from "@prisma/client";

const prisma = new PrismaClient();

const HYD_SCHOOLS = [
  { name: "Chaitanya Bharathi Junior College", area: "Ameerpet" },
  { name: "Narayana Junior College", area: "Kukatpally" },
  { name: "St. Ann's College for Women", area: "Mehdipatnam" },
  { name: "Osmania University", area: "Tarnaka" },
  { name: "JNTU Hyderabad", area: "Kukatpally" }
];

const HYD_NEIGHBOURHOODS = [
  "Madhapur",
  "Kondapur",
  "Kukatpally",
  "Ameerpet",
  "Gachibowli",
  "Dilsukhnagar",
  "Tarnaka",
  "Begumpet",
  "Secunderabad",
  "Himayatnagar"
];

const INTERESTS = [
  { slug: "music", label: "Music" },
  { slug: "gaming", label: "Gaming" },
  { slug: "dance", label: "Dance" },
  { slug: "coding", label: "Coding" },
  { slug: "startups", label: "Startups" },
  { slug: "sports", label: "Sports" },
  { slug: "cinema", label: "Cinema" },
  { slug: "books", label: "Books" },
  { slug: "fashion", label: "Fashion" },
  { slug: "photography", label: "Photography" }
];

async function main() {
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.staffActionAuditLog.deleteMany();
  await prisma.block.deleteMany();
  await prisma.friendConnection.deleteMany();
  await prisma.friendRequest.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.eventUpdate.deleteMany();
  await prisma.event.deleteMany();
  await prisma.postVote.deleteMany();
  await prisma.postReport.deleteMany();
  await prisma.post.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.spaceMute.deleteMany();
  await prisma.spaceMembership.deleteMany();
  await prisma.space.deleteMany();
  await prisma.userInterest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.school.deleteMany();
  await prisma.neighbourhood.deleteMany();
  await prisma.otpSession.deleteMany();

  const schools = await Promise.all(
    HYD_SCHOOLS.map((school) =>
      prisma.school.create({
        data: school
      })
    )
  );

  const neighbourhoods = await Promise.all(
    HYD_NEIGHBOURHOODS.map((name) =>
      prisma.neighbourhood.create({
        data: { name }
      })
    )
  );

  const interests = await Promise.all(
    INTERESTS.map((interest) =>
      prisma.interest.create({
        data: interest
      })
    )
  );

  const admin = await prisma.user.create({
    data: {
      phoneNumber: "9000000001",
      displayName: "Staff Admin",
      username: "staff_admin",
      schoolId: schools[0].id,
      neighbourhoodId: neighbourhoods[0].id,
      onboardingCompletedAt: new Date()
    }
  });

  const userA = await prisma.user.create({
    data: {
      phoneNumber: "9000000002",
      displayName: "Teja",
      username: "teja",
      schoolId: schools[1].id,
      neighbourhoodId: neighbourhoods[1].id,
      tagline: "Weekend tournament runner",
      onboardingCompletedAt: new Date()
    }
  });

  const userB = await prisma.user.create({
    data: {
      phoneNumber: "9000000003",
      displayName: "Mahi",
      username: "mahi",
      schoolId: schools[2].id,
      neighbourhoodId: neighbourhoods[2].id,
      tagline: "Dance and open mics",
      onboardingCompletedAt: new Date()
    }
  });

  for (const [idx, interest] of interests.entries()) {
    const official = await prisma.space.create({
      data: {
        name: `Official ${interest.label}`,
        type: SpaceType.OFFICIAL,
        interestId: interest.id
      }
    });
    await prisma.spaceMembership.createMany({
      data: [
        { userId: admin.id, spaceId: official.id, role: SpaceRole.ADMIN },
        { userId: userA.id, spaceId: official.id, role: SpaceRole.MEMBER },
        ...(idx % 2 === 0 ? [{ userId: userB.id, spaceId: official.id, role: SpaceRole.MEMBER }] : [])
      ]
    });
  }

  const schoolSpace = await prisma.space.create({
    data: {
      name: "OU Campus Space",
      type: SpaceType.SCHOOL,
      schoolId: schools[3].id,
      allowAnonymous: true
    }
  });

  await prisma.spaceMembership.createMany({
    data: [
      { userId: admin.id, spaceId: schoolSpace.id, role: SpaceRole.ADMIN },
      { userId: userA.id, spaceId: schoolSpace.id, role: SpaceRole.MODERATOR },
      { userId: userB.id, spaceId: schoolSpace.id, role: SpaceRole.MEMBER }
    ]
  });

  await prisma.userInterest.createMany({
    data: [
      { userId: userA.id, interestId: interests[0].id },
      { userId: userA.id, interestId: interests[1].id },
      { userId: userA.id, interestId: interests[3].id },
      { userId: userA.id, interestId: interests[5].id },
      { userId: userA.id, interestId: interests[6].id },
      { userId: userB.id, interestId: interests[0].id },
      { userId: userB.id, interestId: interests[2].id },
      { userId: userB.id, interestId: interests[4].id },
      { userId: userB.id, interestId: interests[8].id },
      { userId: userB.id, interestId: interests[9].id }
    ]
  });

  await prisma.friendConnection.create({
    data: {
      userAId: userA.id < userB.id ? userA.id : userB.id,
      userBId: userA.id < userB.id ? userB.id : userA.id
    }
  });

  const thread = await prisma.thread.create({
    data: {
      spaceId: schoolSpace.id,
      authorId: userA.id,
      title: "Inter-college meetup planning",
      body: "Post area suggestions and timings.",
      isAnonymous: false
    }
  });

  await prisma.post.createMany({
    data: [
      {
        threadId: thread.id,
        authorId: userB.id,
        body: "Can we do Tarnaka on Sunday?",
        isAnonymous: true
      },
      {
        threadId: thread.id,
        authorId: userA.id,
        body: "Works for me, adding details soon.",
        isAnonymous: false
      }
    ]
  });

  const officialEvent = await prisma.event.create({
    data: {
      title: "Hyderabad Gen Z Meetup",
      description: "Official community meetup",
      schedule: "Opening + networking + open mic",
      venue: "Madhapur Social Hub",
      area: "Madhapur",
      startAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      price: 0,
      tier: EventTier.OFFICIAL,
      categoryInterestId: interests[0].id,
      creatorId: admin.id,
      isPromoted: true
    }
  });

  const verifiedEvent = await prisma.event.create({
    data: {
      title: "College Dance Jam",
      description: "Open dance battle",
      schedule: "Round 1 + finals",
      venue: "Kukatpally Arena",
      area: "Kukatpally",
      startAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      price: 0,
      tier: EventTier.VERIFIED,
      categoryInterestId: interests[2].id,
      creatorId: userA.id
    }
  });

  await prisma.event.create({
    data: {
      title: "Friend Circle Cricket",
      description: "Community event not shown on pulse",
      schedule: "Morning match",
      venue: "Local Ground",
      area: "Begumpet",
      startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      price: 0,
      tier: EventTier.COMMUNITY,
      categoryInterestId: interests[5].id,
      creatorId: userB.id
    }
  });

  await prisma.eventRegistration.createMany({
    data: [
      {
        eventId: officialEvent.id,
        userId: userA.id,
        qrToken: `QR-${officialEvent.id}-${userA.id}`
      },
      {
        eventId: verifiedEvent.id,
        userId: userB.id,
        qrToken: `QR-${verifiedEvent.id}-${userB.id}`
      }
    ]
  });

  console.log("Seed complete");
  console.log("Sample users:");
  console.log(`- staff admin: ${admin.id} (x-staff-role: staff_admin)`);
  console.log(`- user teja: ${userA.id}`);
  console.log(`- user mahi: ${userB.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

