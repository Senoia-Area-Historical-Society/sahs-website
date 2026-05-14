import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

try {
  initializeApp({
    projectId: 'sahs-archives'
  });
} catch (e) {
  console.error("Firebase Admin initialization failed.");
  process.exit(1);
}

const db = getFirestore();

const currentBoard = [
  {
    id: "shelley-kiley",
    name: "Shelley Kiley",
    title: "President",
    type: "board",
    order: 1
  },
  {
    id: "jeremy-warren",
    name: "Jeremy Warren",
    title: "Vice President",
    type: "board",
    order: 2
  },
  {
    id: "bill-wood",
    name: "Bill Wood",
    title: "Treasurer",
    type: "board",
    order: 3
  },
  {
    id: "angela-rogers",
    name: "Angela Rogers",
    title: "Secretary",
    type: "board",
    order: 4
  },
  {
    id: "greg-crook",
    name: "Greg Crook",
    title: "Director at Large",
    type: "board",
    order: 5
  },
  {
    id: "margaret-ordonez",
    name: "Margaret Ordoñez",
    title: "Director-at-Large",
    type: "board",
    order: 6
  },
  {
    id: "tim-baker",
    name: "Tim Baker",
    title: "Director-at-Large",
    type: "board",
    order: 7
  }
];

const sponsors = [
  {
    id: "coastal-packaging",
    name: "Coastal Packaging",
    type: "sponsor",
    url: "https://www.coastalpackaging.com/"
  },
  {
    id: "first-peoples-bank",
    name: "First People's Bank of Senoia",
    type: "sponsor",
    url: "https://www.senoiahistory.com/sahs-supporters"
  },
  {
    id: "fuller-insurance",
    name: "Fuller Insurance Agency",
    type: "sponsor",
    url: "https://www.fullerinsagency.com"
  },
  {
    id: "kim-peacock",
    name: "Kim Peacock Properties",
    type: "sponsor",
    url: "http://kimberlyjpeacock.com/"
  },
  {
    id: "norcom-inc",
    name: "Norcom Inc",
    type: "sponsor",
    url: "https://www.norcominc.com/"
  },
  {
    id: "sany-america",
    name: "SANY America",
    type: "sponsor",
    url: "https://www.sanyamerica.com"
  },
  {
    id: "tdk",
    name: "TDK",
    type: "sponsor",
    url: "https://www.tdk.com/en/index.html"
  },
  {
    id: "tencate",
    name: "TenCate Protective Fabrics",
    type: "sponsor",
    url: "https://us.tencatefabrics.com/"
  },
  {
    id: "synovus-bank",
    name: "Synovus Bank",
    type: "sponsor",
    url: ""
  },
  {
    id: "country-junction",
    name: "Country Junction Soaps",
    type: "sponsor",
    url: "https://country-junction.com/"
  },
  {
    id: "dr-ventures",
    name: "D&R Ventures",
    type: "sponsor",
    url: ""
  },
  {
    id: "senoia-dda",
    name: "Senoia DDA",
    type: "sponsor",
    url: "https://www.senoia.com/bc-dda"
  }
];

async function sync() {
  console.log('--- Syncing Board and Sponsors ---');
  
  // Clean existing board and sponsors
  const orgRef = db.collection('organization');
  const existing = await orgRef.get();
  
  const batch = db.batch();
  existing.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  console.log(`Deleting ${existing.size} old documents.`);
  
  currentBoard.forEach(member => {
    const ref = orgRef.doc(member.id);
    batch.set(ref, member);
  });
  
  sponsors.forEach(sponsor => {
    const ref = orgRef.doc(sponsor.id);
    batch.set(ref, sponsor);
  });
  
  await batch.commit();
  console.log('Successfully synced board and sponsors.');
}

sync().catch(console.error);
