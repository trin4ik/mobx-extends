import AsyncStorage from '@react-native-async-storage/async-storage'

class DraftAsyncStorage {

    static async get (key) {
        const item = await AsyncStorage.getItem(key)
        return JSON.parse(item)
    }

    static async set (key, value) {
        await AsyncStorage.setItem(key, JSON.stringify(value))
    }

    static async remove (key) {
        await AsyncStorage.removeItem(key)
    }

    static async clear () {
        await AsyncStorage.clear()
    }
}

export default DraftAsyncStorage
