import StoreItem from "./model/Item"
import StoreCollection from "./model/Collection"
import DraftAsyncStorage from "./lib/storage/DraftAsyncStorage"
import TransportAxios from "./lib/transport/TransportAxios"
import TransportLocalStorage from "./lib/transport/TransportLocalStorage"
import defaultsDeep from 'lodash/defaultsDeep'

export {
    StoreItem,
    StoreCollection,
    DraftAsyncStorage,
    TransportAxios,
    TransportLocalStorage,
}

export default class {
    static config = {}

    static setConfig (data) {
        this.config = defaultsDeep(data, this.config)
    }
}
