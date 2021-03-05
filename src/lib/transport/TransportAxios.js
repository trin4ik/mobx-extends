import axios from "axios"
import get from 'lodash/get'

class TransportAxios {

    static prefix = ''
    static processor = axios

    static add = {
        method: 'put',
        url: ''
    }

    static fetch = {
        method: 'get',
        url: ''
    }

    static update = {
        method: 'post',
        url: ''
    }

    static delete = {
        method: 'delete',
        url: ''
    }

    static async pre () {
        return
    }

    static start (data = {}) {
        Object.entries(data).map(item => {
            if (['prefix', 'pre'].indexOf(item[0]) !== -1) {
                this[item[0]] = item[1]
            } else if (['add', 'fetch', 'update', 'delete'].indexOf(item[0]) !== -1) {
                if (typeof item[1] === 'string') {
                    this[item[0]].url = item[1]
                } else {
                    this[item[0]] = item[1]
                }
            } else if (['processor'].indexOf(item[0]) !== -1) {
                // ignored
            } else {
                console.warn('unknown property "', item[0], '" in create transport')
            }
        })
    }

    static async action (action = 'fetch', data = {}, options = {}) {
        if (!this[action]?.method || ['get', 'post', 'put', 'delete', 'patch'].indexOf(this[action].method) === -1) throw 'unknown method "' + this[action]?.method + '"'

        console.log('opt1', options)
        await this.pre(this.processor, action, data, options)
        console.log('opt2', options)

        const url = this[action].url.replace(/{[^}]+}/g, item => {
            const local = get(data, item.replace('{', '').replace('}', ''))
            if (local) {
                return local
            }
            return item
        })

        try {
            let result = false
            switch (this[action]?.method) {
                case 'get':
                case 'delete': {
                    options.params = data
                    result = await this.processor[this[action].method](this.prefix + url, options)
                    break
                }
                case 'post':
                case 'put': {
                    result = await this.processor[this[action].method](this.prefix + url, data, options)
                    break
                }
            }
            return result
        } catch (error) {
            throw error
        }
    }
}

export default TransportAxios