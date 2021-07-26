import { action, computed, makeObservable, observable, runInAction } from "mobx"
import set from 'lodash/set'
import get from 'lodash/get'
import merge from 'lodash/merge'
import union from 'lodash/union'
import flat from 'flat'
import camelCase from 'lodash/camelCase'
import { v4 as uuid } from 'uuid'
import { TransportLocalStorage } from "../index";

class StoreItem {

	id = 'new'
	defaults = {}
	data = {}
	draft = false
	_draft = {}
	transport = false
	_loading = false
	loadingFalseTimeout = 0
	parent = null
	list = ['fetch']
	error = {}

	constructor (store, options) {

		const {
			list = false,
			parent = null,
			defaults = {},
			data = {},
			draft = false,
			transport = false,
			override = {},
			name = false,
			loadingFalseTimeout = false
		} = options

		this.store = store
		this.parent = parent

		if (!name) {
			this.name = this.constructor.name
		}
		if (loadingFalseTimeout) {
			this.loadingFalseTimeout = loadingFalseTimeout
		}
		if (list) {
			let newList = list
			if (!Array.isArray(newList)) {
				newList = [newList]
			}
			this.list = newList
		}

		if (typeof defaults === 'object' && defaults !== null && Object.entries(defaults).length) {
			this.defaults = defaults
		}

		if (transport) {
			this.transport = transport
			if (typeof this.transport.getPrefix === 'function') {
				this.transport.getPrefix = this.getUniqTransportId.bind(this)
			}
		}

		makeObservable(this, {
			list: observable,
			id: observable,
			data: observable,
			_draft: observable,
			error: observable,
			_loading: observable,

			fill: action,
			set: action,
			setError: action,
			clearError: action,
			removeFromList: action,

			action,
			removeDraft: action,

			isDraft: computed,
			isError: computed,
			toJson: computed,
			toJsonWithoutDraft: computed,
			loading: computed
		})

		return (async () => {
			if (!data) {
				this.fill()
				this.id = uuid()
				this.set('id', this.id)
			} else {
				if (typeof data === 'string') {
					const result = await this.action('fetch', data)
					this.fill(result, override)
				} else {
					this.fill(data, override)
				}
			}

			if (draft) {
				this.draft = draft
				await this.loadDraft()
			}

			this.loading = false
			return this
		})()
	}

	get loading () {
		return this._loading
	}

	set loading (value) {
		if (!value && this.loadingFalseTimeout) {
			new Promise(resolve => setTimeout(resolve, this.loadingFalseTimeout)).then(() => {
				runInAction(() => {
					this._loading = value
				})
			})
		} else {
			this._loading = value
		}

	}

	getUniqId () {
		return 'item-' + this.name.toLowerCase() + '-' + this.id
	}

	getUniqTransportId () {
		return this.getUniqId()
	}

	getUniqDraftId () {
		return 'draft-' + this.getUniqId()
	}

	async loadDraft () {
		if (!this.draft) return false
		const draft = await this.draft.get(this.getUniqDraftId())
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
			switch (item[0]) {
				case 'list': {
					let list = item[1]
					if (!Array.isArray(list)) {
						list = [list]
					}
					if (list.includes('__override')) {
						this.list = list
					} else {
						this.list = union(this.list, list)
					}
					break
				}
				default: {
					this[item[0]] = item[1]
				}
			}
		})
	}

	removeFromList (list = []) {
		if (!Array.isArray(list)) {
			list = [list]
		}
		this.list = this.list.filter(item => !list.includes(item))
		if (!this.list.length && this.parent && typeof this.parent.removeItem === 'function') {
			this.parent.removeItem(this.id)
			if (this.draft) {
				this.removeDraft()
			}
			this.fill({})
		}
	}

	set (key, value, withoutDraft = false) {
		let data = this.data
		if (this.draft && !withoutDraft) {
			data = this._draft

			const parent = []
			key.split('.').map(item => {
				if (item == parseInt(item)) {
					set(this._draft, parent.join('.'), get(this.data, parent.join('.')))
				} else {
					parent.push(item)
				}
			})
		}


		const setter = camelCase('set-' + key + '-value')
		if (typeof this[setter] === 'function') {
			set(data, key, this[setter](value))
		} else {
			set(data, key, value)
		}

		if (this.draft && !withoutDraft) {
			this.draft.set(this.getUniqDraftId(), this._draft)
		}

		return this.get(key)
	}

	get (key, defaultValue = undefined, withDraft = false) {

		let data = this.data
		if (this.draft && withDraft && get(this._draft, key) !== undefined) {
			data = this._draft
		}

		const getter = camelCase('get-' + key + '-value')
		if (typeof this[getter] === 'function') {
			return this[getter](get(data, key, defaultValue))
		}


		return get(data, key, defaultValue) !== null ? get(data, key, defaultValue) : defaultValue
	}

	getWithDraft (key, defaultValue = undefined) {
		return this.get(key, defaultValue, true)
	}

	clearError () {
		this.error = {}
	}

	setError (key, description = false) {

		let error = {}
		if (typeof key === 'object' && !description) {
			Object.entries(key).map(item => {
				error[item[0]] = item[1]
			})
		} else {
			error[key] = [description]
		}

		this.error = error
	}

	get toJson () {
		return merge(this.defaults, this.data, this._draft)
	}

	get toJsonWithoutDraft () {
		return merge(this.defaults, this.data)
	}

	get isDraft () {
		const result = {}
		const tmp = flat(merge(this.defaults, this.data, this._draft))

		Object.entries(tmp).map(item => {
			if (!this.draft) result[item[0]] = false
			if (get(this._draft, item[0]) === undefined || JSON.stringify(get(this.data, item[0])) === JSON.stringify(get(this._draft, item[0]))) {
				result[item[0]] = false
			} else {
				result[item[0]] = true
			}
		})

		return result
	}

	get isError () {
		const result = {}
		const tmp = flat(merge(this.defaults, this.data, this._draft))

		Object.entries(tmp).map(item => {
			if (get(this.error, item[0]) !== undefined) {
				result[item[0]] = get(this.error, item[0])
			} else {
				result[item[0]] = false
			}
		})

		return result
	}

	async removeDraft (id = false) {
		if (!this.draft) return false
		await this.draft.remove(id ?? this.getUniqDraftId())
		runInAction(() => {
			this.clearError()
			this._draft = {}
		})
	}

	async action (action, data = {}) {

		if (typeof this[camelCase('before-' + action)] === 'function') {
			const before = await this[camelCase('before-' + action)]()
			if (before === false) {
				return
			}
		}
		this.clearError()
		this.loading = true

		if (this.transport) {
			try {
				const result = await this.transport.action(action, data)
				if (typeof this[camelCase('after-' + action)] === 'function') {
					const after = await this[camelCase('after-' + action)](result)
					if (after === false) {
						return
					}
				}
				return result
			} catch (error) {
				if (typeof this[camelCase('error-' + action)] === 'function') {
					this[camelCase('error-' + action)](error.response)
				}
				throw error
			} finally {
				runInAction(() => {
					this.loading = false
				})
			}
		}

		return this.toJson
	}

	async fetch () {
		try {
			return await this.action('fetch', this.toJson)
		} catch (error) {
			return false
		}
	}

	async add () {
		try {
			const oldDraftId = this.getUniqDraftId()

			if (this.id === 'new' && this.transport instanceof TransportLocalStorage) {
				this.fill({ id: uuid() })
			}

			const result = await this.action('add', this.toJson)

			if (this.draft) {
				this.fill(merge(this.data, this._draft))
				await this.removeDraft(oldDraftId)
			}

			if (typeof this.parent?.update === 'function') {
				if (this.parent?.autoSave) {
					await this.parent?.update()
				}
			}

			return result
		} catch (error) {
			return false
		}
	}

	async remove () {

		try {
			const result = await this.action('delete', this.toJson)

			if (this.draft && this.draft) {
				await this.removeDraft()
			}

			if (typeof this.parent?.removeItem === 'function') {
				this.parent?.removeItem(this.id)
			}

			if (this.parent?.autoSave) {
				this.parent?.update()
			}

			return result
		} catch (error) {
			return false
		}
	}

	async update () {
		try {

			const oldDraftId = this.getUniqDraftId()

			const result = await this.action('update', this.toJson)

			if (this.draft) {
				runInAction(() => {
					this.fill(merge(this.data, this._draft))
				})
				await this.removeDraft(oldDraftId)
			}

			if (typeof this.parent?.update === 'function') {
				if (this.parent?.autoSave) {
					await this.parent?.update()
				}
			}

			return result
		} catch (error) {
			return error
		}
	}
}

export default StoreItem
