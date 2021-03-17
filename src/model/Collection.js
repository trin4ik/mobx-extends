import { action, computed, makeObservable, observable, runInAction } from "mobx"
import { v4 as uuid } from 'uuid'
import { TransportLocalStorage } from "../index"

class StoreCollection {

    id = uuid()
    items = []
    transport = false
    autoSave = false
    loadingFalseTimeout = 0
    _loading = false

    get loading () {
        return this._loading
    }

    set loading (value) {
        if (!value && this.loadingFalseTimeout) {
            new Promise(resolve => setTimeout(resolve, this.loadingFalseTimeout)).then(() => {
                this._loading = value
            })
        } else {
            this._loading = value
        }

    }

    constructor (store, options = {}) {
        const { id = false, transport = false, name = false, loadingFalseTimeout = false, autoSave = false } = options
        this.store = store

        if (!name) {
            this.name = this.constructor.name
        }
        if (loadingFalseTimeout) {
            this.loadingFalseTimeout = loadingFalseTimeout
        }
        if (autoSave) {
            this.autoSave = autoSave
        }
        if (id) {
            this.id = id
        }

        if (transport) {
            this.transport = transport
            if (typeof this.transport.getPrefix === 'function') {
                this.transport.getPrefix = () => this.getUniqTransportId()
            }
        }

        this.loading = false

        makeObservable(this, {
            id: observable,
            _loading: observable,
            items: observable,
            autoSave: observable,

            addItem: action,
            removeItem: action,
            action,
            update: action,

            toJson: computed,
            loading: computed,
        })
    }

    getUniqId () {
        return 'collection-' + this.name.toLowerCase() + '-' + this.id
    }

    getUniqTransportId () {
        return this.getUniqId()
    }

    async action (type = 'fetch', data, options) {
        if (this.transport) {
            this.loading = true
            try {
                const result = await this.transport.action(type, data, options)
                if (result && this.transport instanceof TransportLocalStorage) {
                    runInAction(() => {
                        result.map(item => {
                            this.addItem(item)
                        })
                    })
                }
                return result
            } catch (error) {
                throw error
            } finally {
                runInAction(() => {
                    this.loading = false
                })
            }
        }
    }

    async fetch (data, options) {
        return this.action('fetch', data, options)
    }

    async search (data, options) {
        return this.action('search', data, options)
    }

    async update (data, options = {}) {
        if (this.transport) {

            if (this.transport instanceof TransportLocalStorage) {
                data = []
                this.items.map(item => {
                    data.push(item.getUniqTransportId())
                })
            }

            this.loading = true
            try {
                return await this.transport.action('update', data, options)
            } catch (error) {
                throw error
            } finally {
                runInAction(() => {
                    this.loading = false
                })
            }
        }
    }

    filter (keys = false, list = ['fetch']) {
        if (!Array.isArray(list)) {
            list = [list]
        }
        return this.items.filter(item => {
            if (list.length && !item.list.filter(i => list.includes(i)).length) return false

            const next = Object.entries(keys).map(key => {
                if (typeof key[1] === 'function') {
                    return key[1](item.get(key[0], null, false))
                } else {
                    if (item.get(key[0], null, false) === key[1]) {
                        return true
                    } else {
                        return false
                    }
                }
            })
            if (next.includes(false)) {
                return false
            } else {
                return true
            }
        })
    }

    async addItem (data) {
        this.items.push(data)
    }

    removeItem (id) {
        this.items = this.items.filter(item => item.id !== id)
    }

    get toJson () {
        const result = []
        this.items.map(item => {
            result.push(item.toJson)
        })
        return result
    }
}

export default StoreCollection
