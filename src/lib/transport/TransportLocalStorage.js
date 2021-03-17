import get from 'lodash/get'

class TransportLocalStorage {

    prefix = 'default-storage'

    constructor (data = {}) {
        Object.entries(data).map(item => {
            if (['prefix'].indexOf(item[0]) !== -1) {
                this[item[0]] = item[1]
            } else {
                console.warn('unknown property "', item[0], '" in create transport')
            }
        })
    }

    getPrefix () {
        return this.prefix
    }

    async action (action = 'fetch', data = {}, options = {}) {
        try {
            let result = false

            let key = null
            if (typeof data === 'string') {
                key = data
            } else {
                key = this.getPrefix().replace(/{[^}]+}/g, item => {
                    const local = get(data, item.replace('{', '').replace('}', ''))
                    if (local) {
                        return local
                    }
                    return item
                })
            }

            console.log('get key', key)

            switch (action) {
                case 'fetch': {
                    result = JSON.parse(localStorage.getItem(key))
                    break
                }
                case 'update': {
                    result = localStorage.setItem(key, JSON.stringify(data))
                    break
                }
                case 'delete': {
                    result = localStorage.removeItem(key)
                    break
                }
            }
            return result
        } catch (error) {
            throw error
        }
    }
}

export default TransportLocalStorage
