import axios from "axios"
import MobxExtends from '../../index'
import get from 'lodash/get'

class TransportAxios {

    prefix = ''
    processor = axios

    add = {
        method: 'put',
        url: ''
    }

    fetch = {
        method: 'get',
        url: ''
    }

    update = {
        method: 'post',
        url: ''
    }

    delete = {
        method: 'delete',
        url: ''
    }

    search = {
        method: 'post',
        url: ''
    }

    constructor (data = {}) {
        Object.entries(data).map(item => {
            if (['prefix'].indexOf(item[0]) !== -1) {
                this[item[0]] = item[1]
            } else if (['add', 'fetch', 'update', 'delete', 'search'].indexOf(item[0]) !== -1) {
                if (typeof item[1] === 'string') {
                    this[item[0]].url = item[1]
                } else {
                    this[item[0]] = item[1]
                }
            } else {
                console.warn('unknown property "', item[0], '" in create transport')
            }
        })
    }

    async action (action = 'fetch', data = {}, options = {}) {
        if (!this[action]?.method || ['get', 'post', 'put', 'delete', 'patch'].indexOf(this[action].method) === -1) throw 'unknown method "' + this[action]?.method + '"'

        options.headers = { ...MobxExtends.config?.transport?.axios?.headers, ...options.headers }

        let url
        if (typeof this[action].url === 'function') {
            url = this[action].url(data)
        } else {
            url = this[action].url.replace(/{[^}]+}/g, item => {
                const local = get(data, item.replace('{', '').replace('}', ''))
                if (local) {
                    return local
                }
                return item
            })
        }

        try {
            let result = false
            switch (this[action]?.method) {
                case 'get':
                case 'delete': {
                    //options.params = data
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
