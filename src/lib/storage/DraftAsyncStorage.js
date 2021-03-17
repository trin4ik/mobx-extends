import AsyncStorage from '@react-native-async-storage/async-storage'

class DraftAsyncStorage {

    async get (key) {
        const item = await AsyncStorage.getItem(key)
        return JSON.parse(item)
    }

    async set (key, value) {
        await AsyncStorage.setItem(key, JSON.stringify(value))
    }

    async remove (key) {
        await AsyncStorage.removeItem(key)
    }

    async clear () {
        await AsyncStorage.clear()
    }
}

export default DraftAsyncStorage
