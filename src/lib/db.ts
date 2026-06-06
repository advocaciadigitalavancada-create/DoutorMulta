import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface AppealDocument {
  id?: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
}

// Salva um recurso no banco de dados
export const saveAppeal = async (userId: string, content: string) => {
  try {
    const docRef = await addDoc(collection(db, 'appeals'), {
      userId,
      content,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao salvar o recurso: ", error);
    throw error;
  }
};

// Busca todos os recursos de um usuário
export const getUserAppeals = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'appeals'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AppealDocument[];
  } catch (error) {
    console.error("Erro ao buscar recursos: ", error);
    throw error;
  }
};
