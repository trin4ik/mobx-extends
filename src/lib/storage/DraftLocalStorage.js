class DraftLocalStorage {

    static async get (key) {
        return JSON.parse(localStorage.getItem(key))
    }

    static async set (key, value) {
        localStorage.setItem(key, JSON.stringify(value))
    }

    static async remove (key) {
        localStorage.removeItem(key)
    }

    static async clear () {
        localStorage.clear()
    }
}

export default DraftLocalStorage
