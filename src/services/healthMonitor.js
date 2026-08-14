import { db } from '../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const getDeviceInfo = async () => {
    try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Device) {
            const info = await window.Capacitor.Plugins.Device.getInfo();
            const battery = await window.Capacitor.Plugins.Device.getBatteryInfo();
            return {
                device: info.model || 'Unknown',
                platform: info.platform || 'web',
                osVersion: info.osVersion || 'Unknown',
                batteryLevel: battery.batteryLevel || null,
                isCharging: battery.isCharging || false
            };
        }
    } catch (e) {
        console.warn('Device plugin failed', e);
    }
    return { device: 'Web Browser', platform: 'web' };
};

const getNetworkInfo = async () => {
    try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Network) {
            const status = await window.Capacitor.Plugins.Network.getStatus();
            return {
                isConnected: status.connected,
                networkType: status.connectionType
            };
        }
    } catch (e) {
        console.warn('Network plugin failed', e);
    }
    return { isConnected: navigator.onLine, networkType: navigator.connection?.effectiveType || 'unknown' };
};

const getAppInfo = async () => {
    try {
        if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
            if (window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
                const info = await window.Capacitor.Plugins.App.getInfo();
                return info.version || '1.0.0';
            }
        }
    } catch (e) {
        console.warn('App plugin failed', e);
    }
    return '1.0.0';
};

export const sendHeartbeat = async (user, additionalData = {}) => {
    if (!user || !user.uid) return;

    try {
        const deviceInfo = await getDeviceInfo();
        const networkInfo = await getNetworkInfo();
        const appVersion = await getAppInfo();

        const payload = {
            id: user.uid,
            name: user.displayName || user.fullName || user.name || 'Unknown',
            email: user.email || '',
            rollNo: user.rollNo || user.studentId || user.email?.split('@')[0] || '',
            campus: user.campus || '',
            branch: user.branch || user.department || '',
            
            lastSeen: serverTimestamp(),
            appVersion: appVersion,
            
            ...deviceInfo,
            ...networkInfo,
            
            timetableSyncError: additionalData.timetableSyncError || false,
            firebaseConnectionError: additionalData.firebaseConnectionError || false,
            fcmToken: additionalData.fcmToken || user.fcmToken || null,
            authError: additionalData.authError || false,
            syncDelay: additionalData.syncDelay || 0,
            crashDetected: additionalData.crashDetected || false,
            crashLogs: additionalData.crashLogs || null,
            
            incompleteProfile: !user.campus || !user.branch || !user.currentClass
        };

        const docRef = doc(db, 'app_health', user.uid);
        await setDoc(docRef, payload, { merge: true });
        
    } catch (error) {
        console.error('Failed to send heartbeat', error);
    }
};
