import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const app = initializeApp({ projectId: 'sahs-archives' });
const db1 = getFirestore();
const db2 = getFirestore(app);
const db3 = getFirestore('sahs-archives' as any); // typescript might complain if it's not app

console.log('db1 projectId:', db1.projectId);
// console.log('db3:', db3);
