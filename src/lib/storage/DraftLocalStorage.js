class DraftLocalStorage {

    async get (key) {
        return JSON.parse(localStorage.getItem(key))
    }

    async set (key, value) {
        localStorage.setItem(key, JSON.stringify(value))
    }

    async remove (key) {
        localStorage.removeItem(key)
    }

    async clear () {
        localStorage.clear()
    }
}

export default DraftLocalStorage
