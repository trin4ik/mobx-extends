import { action, computed, makeObservable, observable, toJS, runInAction } from "mobx"
import dayjs from "dayjs"
import set from 'lodash/set'
import get from 'lodash/get'
import toString from 'lodash/toString'
import camelCase from 'lodash/camelCase'
import upperFirst from 'lodash/upperFirst'

class StoreItem {
    defaults = {}
    data = {}
    defaultMixins = []

    constructor (store, options) {

        const { mixins = {}, defaults = {}, data = {}, override = {} } = options

        makeObservable(this, {
            defaults: observable,
            data: observable,

            fill: action,
            set: action,

            toJson: computed,
        })
        this.store = store

        this.defaultMixins.map(mixin => Object.assign(this, mixin))

        if (mixins && typeof mixins === 'object' && mixins.length) {
            mixins.map(mixin => Object.assign(this, mixin))
        }

        if (defaults) {
            this.defaults = defaults
        }

        this.fill(data, override)
    }

    get getDefaults () {
        return this.defaults
    }

    fill (data, override) {
        console.log('fill', data, toJS(this.defaults))
        const fill = { ...this.defaults, ...data }
        Object.entries(fill).map(item => {
            this.fillObjectFunction(item[0], item[1])
        })
        Object.entries(override).map(item => {
            this[item[0]] = item[1]
        })
    }

    fillObjectFunction (key, value) {
        this.data[key] = value
    }

    set (key, value, { silent = false }) {
        const setter = 'set' + upperFirst(camelCase(key)) + 'Value'
        if (typeof this[setter] === 'function') {
            this[setter](value)
        } else {
            set(this.data, key, value)
        }
        if (!silent) {
            this.time.local.updated_at = dayjs()
        }
    }

    get (key, defaultValue = null) {
        const getter = 'get' + upperFirst(camelCase(key)) + 'Value'
        if (typeof this[getter] === 'function') {
            return this[getter](defaultValue)
        }
        return get(this.data, key, defaultValue)
    }

    async save () {
        if (!this.getTransport.hasOwnProperty(this.type)) return false

        this.status.global = 'loading'
        this.status.transport = 'loading'
        this.error = null

        try {
            const result = await this.getTransport[type].run(this.toJson)

            return runInAction(() => {
                this.status.global = null
                this.status.transport = 'done'

                this.getTransport[type].after(result)
            })
        } catch (e) {
            return runInAction(() => {
                this.status.global = null
                this.status.transport = "error"
                this.error = e
            })
        }
    }

    async remove () {
        if (!this.getTransport.remove) return false

        this.status.global = 'loading'
        this.status.transport = 'loading'
        this.error = null

        try {
            const result = await this.getTransport.remove.run(this.toJson)

            return runInAction(() => {
                this.status.global = null
                this.status.transport = 'done'
                this.getTransport.remove.after(result)
            })
        } catch (e) {
            return runInAction(() => {
                this.status.global = null
                this.status.transport = 'error'
                this.error = e
            })
        }
    }

    get toJson () {
        const json = {}
        Object.entries({ ...this.defaults, ...this.data }).map(item => {
            const getter = 'get' + upperFirst(camelCase(item[0])) + 'Value'
            if (typeof this[getter] === 'function') {
                json[item[0]] = toJS(this[getter]())
            } else {
                json[item[0]] = toJS(this.data[item[0]])
            }
        })
        return json
    }


    get getTransport () {
        return toJS(this.transport)
        /*
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

                return result*/
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
