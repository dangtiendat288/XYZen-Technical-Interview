import {Stack, Redirect} from "expo-router";
import {useAuth} from '@/context/AuthContext';

export default function AppLayout(){
    const {session} = useAuth();
    
    return !session ? (
        <Redirect href="/sign-in" />
    ) : (
        <Stack screenOptions={{ headerShown: false }} />
    );
}