import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firebase';

export interface PostComment {
  id: string;
  authorId: string;
  author: string;
  avatar: string;
  content: string;
  likes: number;
  isLiked: boolean;
  time: string;
  replies?: PostComment[];
}

export interface PostAnalytics {
  name: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
}

export interface Post {
  id: string;
  authorId: string;
  author: string;
  avatar: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  images?: string[];
  likes: number;
  comments: number;
  shares: number;
  time: string;
  isLiked: boolean;
  commentsList: PostComment[];
  analytics: PostAnalytics[];
  createdAt?: any;
  isUserAdded?: boolean;
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addPost = async (post: Omit<Post, 'id' | 'createdAt' | 'isUserAdded'>) => {
    try {
      await addDoc(collection(db, 'posts'), {
        ...post,
        isUserAdded: true,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    }
  };

  const updatePost = async (postId: string, data: Partial<Post>) => {
    try {
      await updateDoc(doc(db, 'posts', postId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

  return { posts, loading, addPost, updatePost, deletePost };
}
