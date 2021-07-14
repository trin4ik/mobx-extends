import AsyncStorage from '@react-native-async-storage/async-storage'

class DraftAsyncStorage {

	async get (key) {
		if (key) {
			const item = await AsyncStorage.getItem(key)
			return JSON.parse(item)
		}
		return false
	}

	async set (key, value) {
		if (key) await AsyncStorage.setItem(key, JSON.stringify(value))
	}

	async remove (key) {
		if (key) await AsyncStorage.removeItem(key)
	}

	async clear () {
		await AsyncStorage.clear()
	}
}

export default DraftAsyncStorage
