import { action, computed, makeObservable, observable, toJS, runInAction } from "mobx"
import dayjs from "dayjs"
import set from 'lodash/set'
import get from 'lodash/get'
import toString from 'lodash/toString'
import camelCase from 'lodash/camelCase'
import upperFirst from 'lodash/upperFirst'
import api from "../../network/api"

class StoreItem {

    defaults = {}
    data = {}
    type = 'item'
    time = {
        server: {
            created_at: null,
            updated_at: null,
            deleted_at: null,
            archived_at: null,
        },
        local: {
            updated_at: null
        }
    }
    transport = {
        fetch: false,
        add: false,
        edit: false,
        remove: false,
    }
    status = {
        global: null,
        transport: null,
    }
    error = null
    store = null

    constructor (store) {
        makeObservable(this, {
            defaults: observable,
            data: observable,
            type: observable,
            time: observable,
            transport: observable,
            status: observable,
            error: observable,

            fill: action,
            set: action,
            save: action,
            remove: action,

            toJson: computed,
            getTransport: computed,
        })
        this.store = store
    }

    fill (data, decorate = false, override = {}) {

        const fill = { ...this.defaults, ...data }
        Object.entries(fill).map(item => {

            if (['created_at', 'updated_at', 'deleted_at', 'archived_at'].indexOf(item[0]) !== -1) {
                this.time.server[item[0]] = dayjs(item[1])
            } else {
                if (typeof this['load' + upperFirst(camelCase(item[0]))] === 'function') {
                    this['load' + upperFirst(camelCase(item[0]))](item[1])
                } else if (item[1] !== null && typeof item[1] === 'object' && item[1].hasOwnProperty('length') && typeof this['add' + upperFirst(camelCase(item[0]))] === 'function') {
                    item[1].map(item2 => {
                        this['add' + upperFirst(camelCase(item[0]))](item2)
                    })
                } else {
                    this.data[item[0]] = item[1]
                }
            }
        })
        Object.entries(override).map(item => {
            this[item[0]] = item[1]
        })
    }

    set (key, value) {
        if (this['set' + upperFirst(camelCase(key)) + 'Value']) {
            this['set' + upperFirst(camelCase(key)) + 'Value'](value)
        } else {
            set(this.data, key, value)
        }
        this.time.local.updated_at = dayjs()
    }

    async save () {
        const type = this.type === 'draft' ? 'edit' : 'add'
        if (!this.getTransport[type]) return false

        this.status.global = 'loading'
        this.status.transport = 'loading'
        this.error = null

        try {
            const result = await api[this.getTransport[type].method](this.getTransport[type].url, {
                data: this.toJson
            })

            return runInAction(() => {
                this.status.global = null
                this.status.transport = 'done'

                switch (this.type) {
                    case 'draft': {
                        const find = this.store.items.find(i => i.get('id') === result.data.data.id)
                        if (find) {
                            find.fill(result.data.data)
                            this.store.removeDraft(find)
                        }
                        break
                    }
                    case 'new': {
                        this.store.addItem(result.data.data, 'unshift')
                        this.store.removeDraft(this)
                        break
                    }
                }
                return result.data
            })
        } catch (e) {
            return runInAction(() => {
                this.status.global = null
                this.status.transport = "error"
                this.error = e
                if (get(e, 'data.error')) {
                    return {
                        success: false,
                        error: e.data.error
                    }
                }
                return {
                    success: false,
                    error: e
                }
            })
        }
    }

    async remove () {
        if (!this.getTransport.remove) return false

        this.status.global = 'loading'
        this.status.transport = 'loading'
        this.error = null

        try {
            const result = await api[this.getTransport.remove.method](this.getTransport.remove.url)

            return runInAction(() => {
                this.status.global = null
                this.status.transport = 'done'
                this.store.removeItem(this)
                return result.data
            })
        } catch (e) {
            return runInAction(() => {
                this.status.global = null
                this.status.transport = 'error'
                this.error = e
                if (get(e, 'data.error')) {
                    return {
                        success: false,
                        error: e.data.error
                    }
                }
                return {
                    success: false,
                    error: e
                }
            })
        }
    }

    get (key, defaultValue = null) {
        if (typeof this['get' + upperFirst(camelCase(key)) + 'Value'] === 'function') {
            return this['get' + upperFirst(camelCase(key)) + 'Value'](defaultValue)
        }
        return get(this.data, key, defaultValue)
    }

    get toJson () {
        const json = {}
        Object.entries({ ...this.defaults, ...this.data }).map(item => {
            if (this.hasOwnProperty('get' + upperFirst(camelCase(item[0])) + 'Value')) {
                json[item[0]] = toJS(this['get' + upperFirst(camelCase(item[0])) + 'Value']())
            } else {
                json[item[0]] = toJS(this.data[item[0]])
            }
        })
        json._updated_at = this.time.local.updated_at
        return json
    }


    get getTransport () {
        const result = JSON.parse(JSON.stringify(this.transport))

        Object.entries(result).map(([key, value]) => {
            if (typeof value === 'string') {
                value = {
                    method: null,
                    url: value
                }
            }
            if (value.method === null) {
                value.method = {
                    add: 'put',
                    edit: 'post',
                    fetch: 'get',
                    remove: 'delete',
                }[key]
            }
            value.url = value.url.replace(/{[^}]+}/g, item => {
                const local = this.get(item.replace('{', '').replace('}', ''))
                if (local) {
                    return local
                }
                return item
            })
            result[key] = value
        })

        return result
    }

    getDiffWithOriginal (key) {
        let result = false
        if (this.type === 'draft') {
            const item = this.store.items.find(item => item.get('id') === this.get('id'))
            if (item) {
                if (item.get(key) || this.get(key)) {
                    switch (typeof item.get(key)) {
                        case 'object': {
                            if (JSON.stringify(this.get(key)) !== JSON.stringify(item.get(key))) {
                                result = true
                            }
                            break
                        }
                        default: {
                            if (toString(this.get(key)) !== toString(item.get(key))) {
                                result = true
                            }
                        }
                    }
                }

            }
        }

        return result
    }
}

export default StoreItem
