import { action, computed, makeObservable, observable, reaction, runInAction } from "mobx"
import api from "../../network/api"
import dayjs from "dayjs"
import { v4 as uuidv4 } from 'uuid'

class StoreCollection {

    status = null
    name = null
    error = null
    items = []
    drafts = []
    store = null
    lastUpdate = null
    transport = {
        fetch: false
    }
    itemClass = null
    saveDrafts = null
    useDraft = false

    AsyncStorage = null

    constructor (store, data = {}) {
        makeObservable(this, {
            status: observable,
            name: observable,
            error: observable,
            itemClass: observable,
            items: observable,
            drafts: observable,
            lastUpdate: observable,

            findItem: action,

            addItem: action,
            removeItem: action,
            fetchItems: action,
            getItems: computed,

            addDraft: action,
            removeDraft: action,
            fetchDrafts: action,
            getDrafts: computed,

            getIdsForUpdate: computed,
        })
        this.store = store

        Object.entries(data).map(item => {
            this[item[0]] = item[1]
        })

        if (!this.name) {
            this.name = this.constructor.name
        }

        this.saveDrafts = reaction(() => this.drafts, drafts => {
            drafts.map(async draft => {
                await this.AsyncStorage.setItem('draft:' + this.name + ':' + draft.get('id'), JSON.stringify({ data: draft.toJson, type: draft.type }))
            })
        })
    }

    findItem ({ type = 'add', id = null }) {
        let item = false
        switch (type) {
            case 'view': {
                item = this.items.find(item => item.get('id') === id)
                break
            }
            case 'add': {
                if (this.useDraft) {
                    const find = this.drafts.find(item => item.type === 'add')
                    if (find) {
                        item = find
                    } else {
                        item = this.addDraft()
                    }
                } else {
                    item = this.addItem()
                }
                break
            }
            case 'edit': {
                const find = this.items.find(item => item.get('id') === id)
                if (find) {
                    if (this.useDraft) {
                        const draft = this.drafts.find(item => item.get('id') === id)
                        if (draft) {
                            item = draft
                        } else {
                            item = this.addDraft(find.toJson)
                        }
                    } else {
                        item = find
                    }
                }
                break
            }
        }
        return item
    }

    async fetchDrafts () {
        const keys = await this.AsyncStorage.getAllKeys()
        await keys.map(async item => {
            if (item.indexOf('draft:' + this.name + ':') === 0) {
                const id = item.substr(('draft:' + this.name + ':').length)
                const value = await this.AsyncStorage.getItem(item)
                const json = JSON.parse(value)
                runInAction(() => {
                    this.addDraft(json.data, { type: json.type })
                })

            }
        })
    }

    async fetchItems ({ fetchData = {} }) {
        if (!this.transport.fetch) return false

        this.error = null
        this.status = "loading"

        try {
            const result = await api[this.transport.fetch.method ? this.transport.fetch.method : 'post'](typeof this.transport.fetch === 'object' ? this.transport.fetch.url : this.transport.fetch, {
                data: {
                    ...fetchData,
                    check: this.getIdsForUpdate
                }
            })

            runInAction(() => {
                this.status = "done"

                if (result.data.success) {
                    result.data.data.collection.map(item => {
                        const find = this.items.find(i => i.get('id') === item.id)
                        if (!find) {
                            this.addItem(item)
                        } else {
                            if (find.time.server.updated_at.unix() !== dayjs(item.updated_at).unix()) {
                                find.fill(item)
                            }
                        }

                    })
                    Object.entries(result.data.data.check).map(([id, action]) => {
                        switch (action) {
                            case 'remove': {
                                this.removeItem({ id: parseInt(id) })
                                break
                            }
                        }
                    })

                } else {
                    this.status = 'error'
                    this.error = result.data.error
                }
            })
        } catch (e) {
            runInAction(() => {
                this.status = "error"
                this.error = e
            })
        }
    }

    addItem (data = {}, method = 'push') {
        const item = new this.itemClass(this, data)
        this.items[method](item)
        return item
    }

    removeItem (item) {
        let id = item.get ? item.get('id') : item.id

        this.items = this.items.filter(i => i.get('id') !== id)
        this.removeDraft(this.drafts.find(i => i.get('id') === id))

    }

    addDraft (data = {}, id = null) {
        data.type = 'new'
        if (data.id) {
            id = data.id
        }
        if (id === null) {
            id = uuidv4()
            data.id = id
        }
        if (parseInt(id) == id) {
            id = parseInt(id)
        }
        if (this.items.find(item => item.get('id') === id)) {
            data.type = 'draft'
        }

        const draft = new this.itemClass(this, data, { type: data.type })
        this.drafts.push(draft)
        return draft
    }

    removeDraft (item) {
        let id = item.get ? item.get('id') : item.id

        AsyncStorage.removeItem('draft:' + this.name + ':' + id)
        this.drafts = this.drafts.filter(i => i.get('id') !== id)
    }

    get getItems () {
        const arr = []
        this.items.map(item => {
            arr.push(item.toJson)
        })
        return arr
    }

    get getDrafts () {
        const arr = []
        this.drafts.map(item => {
            arr.push(item.toJson)
        })
        return arr
    }

    get getIdsForUpdate () {
        const result = {}
        this.items.map(item => {
            result[item.get('id')] = item.time.server.updated_at
        })
        return result
    }
}

export default StoreCollection
