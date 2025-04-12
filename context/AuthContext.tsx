import {useContext, createContext, useState, useEffect} from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase/config';
import Loading from '../components/common/Loading';

type AuthContextType = {
  session: boolean;
  user: User | null;
  signin: (email: string, password: string) => Promise<void>;
  signout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: false,
  user: null,
  signin: async () => {},
  signout: async () => {},
  signup: async () => {}
})

const AuthProvider = ({children}: {children: React.ReactNode}) => {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    
    useEffect(() => {
      // Set up authentication state listener
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setSession(!!currentUser);
        setLoading(false);
      });
      
      // Clean up the listener when the component unmounts
      return () => unsubscribe();
    }, []);
    
    const signin = async (email: string, password: string) => {
      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, email, password);
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
      } catch (error) {
        const errorMessage = (error as Error).message;
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    const signup = async (email: string, password: string) => {
      setLoading(true);
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (error) {
        const errorMessage = (error as Error).message;
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    const contextData = {session, user, signin, signout, signup}

    return (
      <AuthContext.Provider value={contextData}>
        {loading ? <Loading /> : children}
      </AuthContext.Provider>
    )
}

const useAuth = () => {return useContext(AuthContext)};

export {useAuth, AuthContext, AuthProvider}