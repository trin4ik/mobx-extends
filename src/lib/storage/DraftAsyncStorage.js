import Storage from '@react-native-async-storage/async-storage'

class DraftAsyncStorage {

    static async get (key) {
        const item = await Storage.getItem(key)
        return JSON.parse(item)
    }

    static async set (key, value) {
        await Storage.setItem(key, JSON.stringify(value))
    }

    static async remove (key) {
        await Storage.removeItem(key)
    }

    static async clear () {
        await Storage.clear()
    }
}

export default DraftAsyncStorage
