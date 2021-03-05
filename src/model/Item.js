import { action, computed, makeObservable, observable, runInAction, toJS } from "mobx"
import set from 'lodash/set'
import get from 'lodash/get'
import merge from 'lodash/merge'
import flat from 'flat'
import camelCase from 'lodash/camelCase'
import { computedFn } from "mobx-utils"

class StoreItem {

    id = 'new'
    defaults = {}
    data = {}
    draft = false
    _draft = {}
    transport = false
    loading = true

    constructor (store, options) {

        const { defaults = {}, data = {}, draft = false, transport = false, override = {}, name = false } = options

        makeObservable(this, {
            id: observable,
            loading: observable,
            data: observable,
            _draft: observable,

            fill: action,
            update: action,
            set: action,

            isDraft: computed,
            toJson: computed,
        })
        this.store = store

        if (!name) {
            this.name = this.constructor.name
        }

        if (typeof defaults === 'object' && defaults !== null && Object.entries(defaults).length) {
            this.defaults = defaults
        }

        if (transport) {
            this.transport = transport
            this.transport.processor.start(this.transport)
        }

        this.fill(data, override)

        if (draft?.enabled) {
            this.draft = draft
            this.loadDraft().then(() => {
                runInAction(() => {
                    this.loading = false
                })
            })
        } else {
            this.loading = false
        }
    }

    get getDraftId () {
        return 'draft-' + this.constructor.name.toLowerCase() + '-' + this.id
    }

    get getId () {
        return 'item-' + this.constructor.name.toLowerCase() + '-' + this.id
    }

    async loadDraft () {
        if (!this.draft?.storage) return false
        const draft = await this.draft.storage.get(this.getDraftId)
        if (draft) {
            runInAction(() => {
                this._draft = draft
            })
        }
    }

    fill (data, override = {}) {
        const fill = merge(this.defaults, data)

        Object.entries(fill).map(item => {
            this.set(item[0], item[1], true)
            if (item[0] === 'id') {
                this.id = item[1]
            }
        })
        Object.entries(override).map(item => {
            this[item[0]] = item[1]
        })
    }

    set (key, value, withoutDraft = false) {

        let data = this.data
        if (this.draft?.enabled && !withoutDraft) {
            data = this._draft
        }

        const setter = camelCase('set-' + key + '-value')
        if (typeof this[setter] === 'function') {
            set(data, key, this[setter](value))
            return this.get(key)
        }

        set(data, key, value)
        if (this.draft?.enabled && !withoutDraft && this.draft?.storage) {
            this.draft.storage.set(this.getDraftId, this._draft)
        }
        return this.get(key)
    }

    get (key, defaultValue = undefined, withDraft = true) {

        let data = this.data
        if (this.draft?.enabled && withDraft && get(this._draft, key) !== undefined) {
            data = this._draft
        }

        const getter = camelCase('get-' + key + '-value')
        if (typeof this[getter] === 'function') {
            return this[getter](get(data, key, defaultValue))
        }


        return get(data, key, defaultValue) !== null ? get(data, key, defaultValue) : defaultValue
    }

    get toJson () {
        return merge(this.defaults, this.data, this._draft)
    }

    get isDraft () {
        const result = {}
        const tmp = flat(merge(this.defaults, this.data, this._draft))

        Object.entries(tmp).map(item => {
            if (!this.draft?.enabled) result[item[0]] = false
            if (get(this._draft, item[0]) === undefined || JSON.stringify(get(this.data, item[0])) === JSON.stringify(get(this._draft, item[0]))) {
                result[item[0]] = false
            } else {
                result[item[0]] = true
            }
        })

        return result
    }

    async removeDraft () {
        if (!this.draft?.storage) return false
        await this.draft.storage.remove(this.getDraftId)
    }

    async update () {
        this.loading = true

        if (this.transport) {
            try {
                const result = await this.transport.processor.action('update', this.toJson)
                if (typeof this['afterUpdate'] === 'function') {
                    this.afterUpdate(result)
                }
                return result
            } catch (error) {
                console.error('update fail', error)
                throw error
            } finally {
                this.loading = false
            }
        } else {
            this.fill(merge(this.data, this._draft))
        }

        this._draft = {}
        if (this.draft?.enabled && this.draft?.storage) {
            await this.removeDraft()
        }

        this.loading = false
        return this.toJson
    }
}

export default StoreItem
