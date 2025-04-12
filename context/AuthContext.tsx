import {useContext, createContext, useState} from 'react';
import Loading from '../components/common/Loading';

const AuthContext = createContext({
  session: false,
  user: null,
  signin: async () => {},
  signout: async () => {}
})

const AuthProvider = ({children}) => {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(false);
    const [user, setUser] = useState(false);
    
    const signin = async () => {}
    const signout = async () => {}

    const contextData = {session, user, signin, signout}

    return (<AuthContext.Provider value={contextData}>
        {loading ? <Loading /> : children}
    </AuthContext.Provider>)
}

const useAuth = () => {return useContext(AuthContext)};

export {useAuth, AuthContext, AuthProvider}
