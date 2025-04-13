import {useContext, createContext, useState, useEffect} from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase/config';
import { db } from '../firebase/config';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import Loading from '../components/common/Loading';

// Extended user type with profile information
interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
  photoURL: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  createdAt: Date | null;
}

type AuthContextType = {
  session: boolean;
  user: User | null;
  userProfile: UserProfile | null;
  signin: (email: string, password: string) => Promise<void>;
  signout: () => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: false,
  user: null,
  userProfile: null,
  signin: async () => {},
  signout: async () => {},
  signup: async () => {},
  updateProfile: async () => {}
})

const AuthProvider = ({children}: {children: React.ReactNode}) => {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    
    // Fetch user profile data from Firestore
    const fetchUserProfile = async (userId: string) => {
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserProfile({
            uid: userId,
            email: user?.email || null,
            displayName: userData.displayName || null,
            username: userData.username || null,
            photoURL: userData.photoURL || null,
            bio: userData.bio || null,
            followersCount: userData.followersCount || 0,
            followingCount: userData.followingCount || 0,
            createdAt: userData.createdAt ? new Date(userData.createdAt.toDate()) : null,
          });
        } else {
          // If no profile exists yet, return basic info
          setUserProfile({
            uid: userId,
            email: user?.email || null,
            displayName: null,
            username: null,
            photoURL: null,
            bio: null,
            followersCount: 0,
            followingCount: 0,
            createdAt: null
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };
    
    useEffect(() => {
      // Set up authentication state listener
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        setSession(!!currentUser);
        
        if (currentUser) {
          // If user is logged in, fetch their profile data
          await fetchUserProfile(currentUser.uid);
        } else {
          // Reset user profile when logged out
          setUserProfile(null);
        }
        
        setLoading(false);
      });
      
      // Clean up the listener when the component unmounts
      return () => unsubscribe();
    }, []);
    
    const signin = async (email: string, password: string) => {
      setLoading(true);
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // After successful login, fetch user profile
        await fetchUserProfile(userCredential.user.uid);
      } catch (error) {
        const errorMessage = (error as Error).message;
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    
    const signout = async () => {
      setLoading(true);
      try {
        await signOut(auth);
        setUserProfile(null);
      } catch (error) {
        const errorMessage = (error as Error).message;
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    const signup = async (email: string, password: string, username: string) => {
      setLoading(true);
      try {
        // Validate inputs to prevent undefined values
        if (!email || !password || !username) {
          throw new Error("Email, password, and username are required");
        }
        
        // Create the user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create a user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          email: email,
          username: username || "", // Fallback to empty string if somehow undefined
          displayName: "",
          photoURL: null,
          bio: "",
          followersCount: 0,
          followingCount: 0,
          createdAt: serverTimestamp(),
        });
        
        // Load the user profile
        await fetchUserProfile(user.uid);
      } catch (error) {
        const errorMessage = (error as Error).message;
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    
    const updateProfile = async (data: Partial<UserProfile>) => {
      if (!user) throw new Error("No user logged in");
      
      setLoading(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        
        // Only update specified fields
        const updateData: Record<string, any> = {};
        if (data.displayName !== undefined) updateData.displayName = data.displayName;
        if (data.username !== undefined) updateData.username = data.username;
        if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;
        if (data.bio !== undefined) updateData.bio = data.bio;
        
        await setDoc(userDocRef, updateData, { merge: true });
        
        // Refresh user profile after update
        await fetchUserProfile(user.uid);
      } catch (error) {
        const errorMessage = (error as Error).message;
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    const contextData = {
      session, 
      user, 
      userProfile,
      signin, 
      signout, 
      signup,
      updateProfile
    }

    return (
      <AuthContext.Provider value={contextData}>
        {loading ? <Loading /> : children}
      </AuthContext.Provider>
    )
}

const useAuth = () => {return useContext(AuthContext)};

export {useAuth, AuthContext, AuthProvider}