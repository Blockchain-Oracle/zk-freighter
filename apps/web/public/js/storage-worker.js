export class Config {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ConfigFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_config_free(ptr, 0);
    }
    /**
     * @param {string} rpc_url
     * @param {string | null} [bootnode_url]
     * @param {boolean | null} [background_events]
     */
    constructor(rpc_url, bootnode_url, background_events) {
        const ptr0 = passStringToWasm0(rpc_url, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(bootnode_url) ? 0 : passStringToWasm0(bootnode_url, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.config_new(ptr0, len0, ptr1, len1, isLikeNone(background_events) ? 0xFFFFFF : background_events ? 1 : 0);
        this.__wbg_ptr = ret;
        ConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) Config.prototype[Symbol.dispose] = Config.prototype.free;

export class MainThreadHandle {
    static __wrap(ptr) {
        const obj = Object.create(MainThreadHandle.prototype);
        obj.__wbg_ptr = ptr;
        MainThreadHandleFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MainThreadHandleFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_mainthreadhandle_free(ptr, 0);
    }
    /**
     * @returns {WebClient}
     */
    get webClient() {
        const ret = wasm.mainthreadhandle_webClient(this.__wbg_ptr);
        return WebClient.__wrap(ret);
    }
}
if (Symbol.dispose) MainThreadHandle.prototype[Symbol.dispose] = MainThreadHandle.prototype.free;

/**
 * A struct representing a Trap
 */
export class Trap {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TrapFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_trap_free(ptr, 0);
    }
    /**
     * A marker method to indicate that an object is an instance of the `Trap`
     * class.
     */
    static __wbg_wasmer_trap() {
        wasm.trap___wbg_wasmer_trap();
    }
}
if (Symbol.dispose) Trap.prototype[Symbol.dispose] = Trap.prototype.free;

export class WebClient {
    static __wrap(ptr) {
        const obj = Object.create(WebClient.prototype);
        obj.__wbg_ptr = ptr;
        WebClientFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WebClientFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_webclient_free(ptr, 0);
    }
    /**
     * @param {string} address
     * @param {string} disclaimer_hash_hex
     * @returns {Promise<void>}
     */
    acceptDisclaimer(address, disclaimer_hash_hex) {
        const ptr0 = passStringToWasm0(address, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(disclaimer_hash_hex, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_acceptDisclaimer(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @returns {Promise<any>}
     */
    allContractsData() {
        const ret = wasm.webclient_allContractsData(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @returns {Promise<any>}
     */
    aspState() {
        const ret = wasm.webclient_aspState(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @returns {any}
     */
    contractConfig() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.webclient_contractConfig(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {string} address
     * @param {Uint8Array} signature
     * @returns {Promise<void>}
     */
    deriveAndSaveUserKeys(address, signature) {
        const ptr0 = passStringToWasm0(address, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(signature, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_deriveAndSaveUserKeys(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @param {bigint} membership_blinding
     * @param {string} pubkey_hex
     * @returns {Promise<any>}
     */
    deriveAspUserLeaf(membership_blinding, pubkey_hex) {
        const ptr0 = passStringToWasm0(pubkey_hex, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_deriveAspUserLeaf(this.__wbg_ptr, addHeapObject(membership_blinding), ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {string} pool_contract_id
     * @param {string} user_address
     * @param {bigint} amount
     * @param {Array<any>} output_amounts
     * @param {Function} submit_fn
     * @param {Function | null} [on_status]
     * @returns {Promise<any>}
     */
    executeDeposit(pool_contract_id, user_address, amount, output_amounts, submit_fn, on_status) {
        const ptr0 = passStringToWasm0(pool_contract_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(user_address, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_executeDeposit(this.__wbg_ptr, ptr0, len0, ptr1, len1, addHeapObject(amount), addHeapObject(output_amounts), addHeapObject(submit_fn), isLikeNone(on_status) ? 0 : addHeapObject(on_status));
        return takeObject(ret);
    }
    /**
     * @param {string} pool_contract_id
     * @param {string} user_address
     * @param {string} ext_recipient
     * @param {bigint} ext_amount
     * @param {Array<any>} input_note_ids
     * @param {Array<any>} output_amounts
     * @param {Array<any>} out_recipient_note_keys_hex
     * @param {Array<any>} out_recipient_enc_keys_hex
     * @param {Function} submit_fn
     * @param {Function | null} [on_status]
     * @returns {Promise<any>}
     */
    executeTransact(pool_contract_id, user_address, ext_recipient, ext_amount, input_note_ids, output_amounts, out_recipient_note_keys_hex, out_recipient_enc_keys_hex, submit_fn, on_status) {
        const ptr0 = passStringToWasm0(pool_contract_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(user_address, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(ext_recipient, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_executeTransact(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, addHeapObject(ext_amount), addHeapObject(input_note_ids), addHeapObject(output_amounts), addHeapObject(out_recipient_note_keys_hex), addHeapObject(out_recipient_enc_keys_hex), addHeapObject(submit_fn), isLikeNone(on_status) ? 0 : addHeapObject(on_status));
        return takeObject(ret);
    }
    /**
     * @param {string} pool_contract_id
     * @param {string} user_address
     * @param {bigint} amount
     * @param {string} recipient_note_key_hex
     * @param {string} recipient_enc_key_hex
     * @param {Function} submit_fn
     * @param {Function | null} [on_status]
     * @returns {Promise<any>}
     */
    executeTransfer(pool_contract_id, user_address, amount, recipient_note_key_hex, recipient_enc_key_hex, submit_fn, on_status) {
        const ptr0 = passStringToWasm0(pool_contract_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(user_address, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(recipient_note_key_hex, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(recipient_enc_key_hex, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len3 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_executeTransfer(this.__wbg_ptr, ptr0, len0, ptr1, len1, addHeapObject(amount), ptr2, len2, ptr3, len3, addHeapObject(submit_fn), isLikeNone(on_status) ? 0 : addHeapObject(on_status));
        return takeObject(ret);
    }
    /**
     * @param {string} pool_contract_id
     * @param {string} user_address
     * @param {string} withdraw_recipient
     * @param {bigint} amount
     * @param {Function} submit_fn
     * @param {Function | null} [on_status]
     * @returns {Promise<any>}
     */
    executeWithdraw(pool_contract_id, user_address, withdraw_recipient, amount, submit_fn, on_status) {
        const ptr0 = passStringToWasm0(pool_contract_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(user_address, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(withdraw_recipient, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_executeWithdraw(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, addHeapObject(amount), addHeapObject(submit_fn), isLikeNone(on_status) ? 0 : addHeapObject(on_status));
        return takeObject(ret);
    }
    /**
     * @param {string} pool_contract_id
     * @param {string} user_address
     * @param {string} selected_commitment_hex
     * @param {string} authority_label
     * @param {string} authority_identity_payload_hex
     * @param {string} purpose
     * @param {bigint} context_nonce
     * @param {Function | null} [on_status]
     * @returns {Promise<any>}
     */
    generateSelectiveDisclosure(pool_contract_id, user_address, selected_commitment_hex, authority_label, authority_identity_payload_hex, purpose, context_nonce, on_status) {
        const ptr0 = passStringToWasm0(pool_contract_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(user_address, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(selected_commitment_hex, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(authority_label, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passStringToWasm0(authority_identity_payload_hex, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len4 = WASM_VECTOR_LEN;
        const ptr5 = passStringToWasm0(purpose, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len5 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_generateSelectiveDisclosure(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5, addHeapObject(context_nonce), isLikeNone(on_status) ? 0 : addHeapObject(on_status));
        return takeObject(ret);
    }
    /**
     * @param {string} address
     * @returns {Promise<any>}
     */
    getASPSecret(address) {
        const ptr0 = passStringToWasm0(address, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_getASPSecret(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {string} address
     * @returns {Promise<any>}
     */
    getDisclaimerState(address) {
        const ptr0 = passStringToWasm0(address, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_getDisclaimerState(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {number} limit
     * @returns {Promise<any>}
     */
    getRecentPoolActivity(limit) {
        const ret = wasm.webclient_getRecentPoolActivity(this.__wbg_ptr, limit);
        return takeObject(ret);
    }
    /**
     * @param {number} limit
     * @returns {Promise<any>}
     */
    getRecentPublicKeys(limit) {
        const ret = wasm.webclient_getRecentPublicKeys(this.__wbg_ptr, limit);
        return takeObject(ret);
    }
    /**
     * @param {string} pool_contract_id
     * @param {string} address
     * @returns {Promise<any>}
     */
    getUnspentUserNotes(pool_contract_id, address) {
        const ptr0 = passStringToWasm0(pool_contract_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(address, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_getUnspentUserNotes(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @param {string} address
     * @returns {Promise<any>}
     */
    getUserKeys(address) {
        const ptr0 = passStringToWasm0(address, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_getUserKeys(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {string} address
     * @param {number} limit
     * @returns {Promise<any>}
     */
    getUserNotes(address, limit) {
        const ptr0 = passStringToWasm0(address, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_getUserNotes(this.__wbg_ptr, ptr0, len0, limit);
        return takeObject(ret);
    }
    /**
     * @returns {string}
     */
    keyDerivationMessage() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.webclient_keyDerivationMessage(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export4(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} pool_contract_id
     * @param {string} user_address
     * @param {bigint} amount
     * @returns {Promise<any>}
     */
    plan(pool_contract_id, user_address, amount) {
        const ptr0 = passStringToWasm0(pool_contract_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(user_address, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_plan(this.__wbg_ptr, ptr0, len0, ptr1, len1, addHeapObject(amount));
        return takeObject(ret);
    }
    /**
     * @param {string} pool_contract_id
     * @param {string} user_address
     * @param {string} note_public_key_hex
     * @param {string} encryption_public_key_hex
     * @returns {Promise<any>}
     */
    prepareRegisterPublicKeys(pool_contract_id, user_address, note_public_key_hex, encryption_public_key_hex) {
        const ptr0 = passStringToWasm0(pool_contract_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(user_address, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(note_public_key_hex, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(encryption_public_key_hex, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len3 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_prepareRegisterPublicKeys(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
        return takeObject(ret);
    }
    /**
     * @param {string} url
     * @returns {Promise<void>}
     */
    setBootnodeConfig(url) {
        const ptr0 = passStringToWasm0(url, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_setBootnodeConfig(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @returns {Promise<void>}
     */
    syncPoolEvents() {
        const ret = wasm.webclient_syncPoolEvents(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {string} receipt_json
     * @param {string} expected_vk_hash
     * @returns {Promise<any>}
     */
    verifySelectiveDisclosure(receipt_json, expected_vk_hash) {
        const ptr0 = passStringToWasm0(receipt_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(expected_vk_hash, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_verifySelectiveDisclosure(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
}
if (Symbol.dispose) WebClient.prototype[Symbol.dispose] = WebClient.prototype.free;

/**
 * @param {Config} config
 * @returns {Promise<MainThreadHandle>}
 */
export function mainThread(config) {
    _assertClass(config, Config);
    var ptr0 = config.__destroy_into_raw();
    const ret = wasm.mainThread(ptr0);
    return takeObject(ret);
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_3639a60ed15f87e7: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_String_8564e559799eccda: function(arg0, arg1) {
            const ret = String(getObject(arg1));
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_debug_string_07cb72cfcc952e2b: function(arg0, arg1) {
            const ret = debugString(getObject(arg1));
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_is_bigint_d6a8167cac401b95: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'bigint';
            return ret;
        },
        __wbg___wbindgen_is_function_2f0fd7ceb86e64c5: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_null_066086be3abe9bb3: function(arg0) {
            const ret = getObject(arg0) === null;
            return ret;
        },
        __wbg___wbindgen_is_object_5b22ff2418063a9c: function(arg0) {
            const val = getObject(arg0);
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_eddc07a3efad52e6: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_244a92c34d3b6ec0: function(arg0) {
            const ret = getObject(arg0) === undefined;
            return ret;
        },
        __wbg___wbindgen_string_get_965592073e5d848c: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_9c75d47bf9e7731e: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_158e43e869788cdc: function(arg0) {
            getObject(arg0)._wbg_cb_unref();
        },
        __wbg_abort_43913e33ecb83d0d: function(arg0, arg1) {
            getObject(arg0).abort(getObject(arg1));
        },
        __wbg_abort_87eb7f23cf4b73d1: function(arg0) {
            getObject(arg0).abort();
        },
        __wbg_append_8df396311184f750: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_arrayBuffer_87e3ac06d961f7a0: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).arrayBuffer();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_buffer_9ee17426fe5a5d65: function(arg0) {
            const ret = getObject(arg0).buffer;
            return addHeapObject(ret);
        },
        __wbg_byteLength_1f57c71e64ee0180: function(arg0) {
            const ret = getObject(arg0).byteLength;
            return ret;
        },
        __wbg_byteOffset_648d0af273024f3d: function(arg0) {
            const ret = getObject(arg0).byteOffset;
            return ret;
        },
        __wbg_call_a41d6421b30a32c5: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_clearTimeout_1ccca1faf41fc6f8: function(arg0) {
            const ret = clearTimeout(takeObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_clearTimeout_3629d6209dfcc46e: function(arg0) {
            const ret = clearTimeout(takeObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_close_9e660a675175d306: function(arg0) {
            getObject(arg0).close();
        },
        __wbg_createObjectURL_ff4de9deb3f8d0a6: function() { return handleError(function (arg0, arg1) {
            const ret = URL.createObjectURL(getObject(arg1));
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg_createSyncAccessHandle_5801784c68dffe64: function(arg0) {
            const ret = getObject(arg0).createSyncAccessHandle();
            return addHeapObject(ret);
        },
        __wbg_crypto_38df2bab126b63dc: function(arg0) {
            const ret = getObject(arg0).crypto;
            return addHeapObject(ret);
        },
        __wbg_data_4a14fad4c5f216c4: function(arg0) {
            const ret = getObject(arg0).data;
            return addHeapObject(ret);
        },
        __wbg_debug_94a9fb2c3e2982f9: function(arg0, arg1, arg2, arg3) {
            console.debug(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
        },
        __wbg_done_b1afd6201ac045e0: function(arg0) {
            const ret = getObject(arg0).done;
            return ret;
        },
        __wbg_entries_7b6e1805c22668f3: function(arg0) {
            const ret = getObject(arg0).entries();
            return addHeapObject(ret);
        },
        __wbg_entries_83f42485034accab: function(arg0) {
            const ret = getObject(arg0).entries();
            return addHeapObject(ret);
        },
        __wbg_error_48655ee7e4756f8b: function(arg0) {
            console.error(getObject(arg0));
        },
        __wbg_error_a6fa202b58aa1cd3: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_export4(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_error_e92447754a575869: function(arg0, arg1, arg2, arg3) {
            console.error(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
        },
        __wbg_fetch_1a030943aa8e0c38: function(arg0, arg1) {
            const ret = getObject(arg0).fetch(getObject(arg1));
            return addHeapObject(ret);
        },
        __wbg_fetch_c6486a0142348bc8: function(arg0) {
            const ret = fetch(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_fill_2a2acd14b0cf134b: function(arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).fill(arg1, arg2 >>> 0, arg3 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_flush_f5dc92f0aae58463: function() { return handleError(function (arg0) {
            getObject(arg0).flush();
        }, arguments); },
        __wbg_getDate_3125ccbd2287cd41: function(arg0) {
            const ret = getObject(arg0).getDate();
            return ret;
        },
        __wbg_getDay_2792f645ebf6757d: function(arg0) {
            const ret = getObject(arg0).getDay();
            return ret;
        },
        __wbg_getDirectoryHandle_41607d7ab5c5d4ec: function(arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).getDirectoryHandle(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        },
        __wbg_getDirectory_d428efb9f123807a: function(arg0) {
            const ret = getObject(arg0).getDirectory();
            return addHeapObject(ret);
        },
        __wbg_getFileHandle_edbdf7040fe8f2ed: function(arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).getFileHandle(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        },
        __wbg_getFullYear_3b262790090055a4: function(arg0) {
            const ret = getObject(arg0).getFullYear();
            return ret;
        },
        __wbg_getHours_c9732aeae765eb42: function(arg0) {
            const ret = getObject(arg0).getHours();
            return ret;
        },
        __wbg_getMinutes_734f5fc547107704: function(arg0) {
            const ret = getObject(arg0).getMinutes();
            return ret;
        },
        __wbg_getMonth_a05a33ddd62f0d8a: function(arg0) {
            const ret = getObject(arg0).getMonth();
            return ret;
        },
        __wbg_getRandomValues_477b66419bbb968d: function() { return handleError(function (arg0, arg1) {
            globalThis.crypto.getRandomValues(getArrayU8FromWasm0(arg0, arg1));
        }, arguments); },
        __wbg_getRandomValues_c44a50d8cfdaebeb: function() { return handleError(function (arg0, arg1) {
            getObject(arg0).getRandomValues(getObject(arg1));
        }, arguments); },
        __wbg_getSeconds_540b42f080d49830: function(arg0) {
            const ret = getObject(arg0).getSeconds();
            return ret;
        },
        __wbg_getSize_7ebdae216262d623: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).getSize();
            return ret;
        }, arguments); },
        __wbg_getTime_e599bee315e19eba: function(arg0) {
            const ret = getObject(arg0).getTime();
            return ret;
        },
        __wbg_getTimezoneOffset_d843b3968046e734: function(arg0) {
            const ret = getObject(arg0).getTimezoneOffset();
            return ret;
        },
        __wbg_getUint32_04dd23d987dad50d: function(arg0, arg1) {
            const ret = getObject(arg0).getUint32(arg1 >>> 0);
            return ret;
        },
        __wbg_get_41476db20fef99a8: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_get_652f640b3b0b6e3e: function(arg0, arg1) {
            const ret = getObject(arg0)[arg1 >>> 0];
            return addHeapObject(ret);
        },
        __wbg_get_index_266bdeb37a6c8106: function(arg0, arg1) {
            const ret = getObject(arg0)[arg1 >>> 0];
            return ret;
        },
        __wbg_has_3a6f31f647e0ba22: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.has(getObject(arg0), getObject(arg1));
            return ret;
        }, arguments); },
        __wbg_headers_de17f740bce997ae: function(arg0) {
            const ret = getObject(arg0).headers;
            return addHeapObject(ret);
        },
        __wbg_href_53712054c453ff9f: function() { return handleError(function (arg0, arg1) {
            const ret = getObject(arg1).href;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg_info_eba996fb48d58831: function(arg0, arg1, arg2, arg3) {
            console.info(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
        },
        __wbg_instanceof_Promise_1208ac2399c33e10: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Promise;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Response_370b83aa6c17e88a: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Response;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Window_4153c1818a1c0c0b: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Window;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_WorkerGlobalScope_62ef0414f7e1d9d1: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof WorkerGlobalScope;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_c6c6ef8308995bcf: function(arg0) {
            const ret = Array.isArray(getObject(arg0));
            return ret;
        },
        __wbg_length_0a6ce016dc1460b0: function(arg0) {
            const ret = getObject(arg0).length;
            return ret;
        },
        __wbg_length_ba3c032602efe310: function(arg0) {
            const ret = getObject(arg0).length;
            return ret;
        },
        __wbg_location_0f18c0567ac29e07: function(arg0) {
            const ret = getObject(arg0).location;
            return addHeapObject(ret);
        },
        __wbg_log_36199e35916a41aa: function(arg0, arg1, arg2, arg3) {
            console.log(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
        },
        __wbg_mainthreadhandle_new: function(arg0) {
            const ret = MainThreadHandle.__wrap(arg0);
            return addHeapObject(ret);
        },
        __wbg_msCrypto_bd5a034af96bcba6: function(arg0) {
            const ret = getObject(arg0).msCrypto;
            return addHeapObject(ret);
        },
        __wbg_navigator_83daf29f5beb4064: function(arg0) {
            const ret = getObject(arg0).navigator;
            return addHeapObject(ret);
        },
        __wbg_new_0_e486ec9936f7edbf: function() {
            const ret = new Date();
            return addHeapObject(ret);
        },
        __wbg_new_18865c63fa645c6f: function() { return handleError(function () {
            const ret = new Headers();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_227d7c05414eb861: function() {
            const ret = new Error();
            return addHeapObject(ret);
        },
        __wbg_new_2fad8ca02fd00684: function() {
            const ret = new Object();
            return addHeapObject(ret);
        },
        __wbg_new_3baa8d9866155c79: function() {
            const ret = new Array();
            return addHeapObject(ret);
        },
        __wbg_new_51ff470dc2f61e27: function() { return handleError(function () {
            const ret = new AbortController();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_8454eee672b2ba6e: function(arg0) {
            const ret = new Uint8Array(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_new_b47e026ba742fe65: function(arg0) {
            const ret = new Date(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_new_b8c00ea5e985ad9c: function(arg0, arg1, arg2) {
            const ret = new DataView(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_new_from_slice_5a173c243af2e823: function(arg0, arg1) {
            const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_new_typed_1137602701dc87d4: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return __wasm_bindgen_func_elem_890(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return addHeapObject(ret);
            } finally {
                state0.a = 0;
            }
        },
        __wbg_new_with_base_81c3111cd317efaf: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = new URL(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_with_length_9011f5da794bf5d9: function(arg0) {
            const ret = new Uint8Array(arg0 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_new_with_options_a99de022c218da8c: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = new Worker(getStringFromWasm0(arg0, arg1), getObject(arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_with_str_and_init_da311e12114f4d1e: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_with_str_sequence_and_options_d582f60b3b1caf49: function() { return handleError(function (arg0, arg1) {
            const ret = new Blob(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_with_year_month_day_110f7ebcb5bcf261: function(arg0, arg1, arg2) {
            const ret = new Date(arg0 >>> 0, arg1, arg2);
            return addHeapObject(ret);
        },
        __wbg_next_84898466512a967f: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).next();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_next_aacee310bcfe6461: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).next();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_node_84ea875411254db1: function(arg0) {
            const ret = getObject(arg0).node;
            return addHeapObject(ret);
        },
        __wbg_postMessage_b8899b5b0ca9ad5f: function() { return handleError(function (arg0, arg1) {
            getObject(arg0).postMessage(getObject(arg1));
        }, arguments); },
        __wbg_postMessage_ead2ef5ee8c7a94e: function() { return handleError(function (arg0, arg1) {
            getObject(arg0).postMessage(getObject(arg1));
        }, arguments); },
        __wbg_process_44c7a14e11e9f69e: function(arg0) {
            const ret = getObject(arg0).process;
            return addHeapObject(ret);
        },
        __wbg_prototypesetcall_fd4050e806e1d519: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), getObject(arg2));
        },
        __wbg_push_60a5366c0bb22a7d: function(arg0, arg1) {
            const ret = getObject(arg0).push(getObject(arg1));
            return ret;
        },
        __wbg_queueMicrotask_40ac6ffc2848ba77: function(arg0) {
            queueMicrotask(getObject(arg0));
        },
        __wbg_queueMicrotask_74d092439f6494c1: function(arg0) {
            const ret = getObject(arg0).queueMicrotask;
            return addHeapObject(ret);
        },
        __wbg_randomFillSync_6c25eac9869eb53c: function() { return handleError(function (arg0, arg1) {
            getObject(arg0).randomFillSync(takeObject(arg1));
        }, arguments); },
        __wbg_random_fc287e2ecb3e2805: function() {
            const ret = Math.random();
            return ret;
        },
        __wbg_read_72e82f3f505b8b4a: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).read(getArrayU8FromWasm0(arg1, arg2), getObject(arg3));
            return ret;
        }, arguments); },
        __wbg_read_d67a54b770176645: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).read(getObject(arg1), getObject(arg2));
            return ret;
        }, arguments); },
        __wbg_replace_37ce356c79417955: function(arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).replace(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            return addHeapObject(ret);
        },
        __wbg_require_b4edbdcf3e2a1ef0: function() { return handleError(function () {
            const ret = module.require;
            return addHeapObject(ret);
        }, arguments); },
        __wbg_resolve_9feb5d906ca62419: function(arg0) {
            const ret = Promise.resolve(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_setTimeout_30be5552e4410378: function(arg0, arg1) {
            const ret = setTimeout(getObject(arg0), arg1);
            return addHeapObject(ret);
        },
        __wbg_setTimeout_56bcdccbad22fd44: function() { return handleError(function (arg0, arg1) {
            const ret = setTimeout(getObject(arg0), arg1);
            return addHeapObject(ret);
        }, arguments); },
        __wbg_setUint32_e0b783cc7c089ba8: function(arg0, arg1, arg2) {
            getObject(arg0).setUint32(arg1 >>> 0, arg2 >>> 0);
        },
        __wbg_set_5337f8ac82364a3f: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
            return ret;
        }, arguments); },
        __wbg_set_6be42768c690e380: function(arg0, arg1, arg2) {
            getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
        },
        __wbg_set_at_43ef9e92a1449d80: function(arg0, arg1) {
            getObject(arg0).at = arg1;
        },
        __wbg_set_b0d9dc239ecdb765: function(arg0, arg1, arg2) {
            getObject(arg0).set(getArrayU8FromWasm0(arg1, arg2));
        },
        __wbg_set_body_aaff4f5f9991f342: function(arg0, arg1) {
            getObject(arg0).body = getObject(arg1);
        },
        __wbg_set_cache_d1f2b7b4dfa39317: function(arg0, arg1) {
            getObject(arg0).cache = __wbindgen_enum_RequestCache[arg1];
        },
        __wbg_set_create_637fdbc7119e4631: function(arg0, arg1) {
            getObject(arg0).create = arg1 !== 0;
        },
        __wbg_set_create_bc239cc43df001d6: function(arg0, arg1) {
            getObject(arg0).create = arg1 !== 0;
        },
        __wbg_set_credentials_f31e4d30b974ce14: function(arg0, arg1) {
            getObject(arg0).credentials = __wbindgen_enum_RequestCredentials[arg1];
        },
        __wbg_set_f614f6a0608d1d1d: function(arg0, arg1, arg2) {
            getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
        },
        __wbg_set_headers_ae96049ea40e9eef: function(arg0, arg1) {
            getObject(arg0).headers = getObject(arg1);
        },
        __wbg_set_method_0eea8a5597775fa1: function(arg0, arg1, arg2) {
            getObject(arg0).method = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_mode_9fe47bff60a1580d: function(arg0, arg1) {
            getObject(arg0).mode = __wbindgen_enum_RequestMode[arg1];
        },
        __wbg_set_onmessage_2686976b9bf47e87: function(arg0, arg1) {
            getObject(arg0).onmessage = getObject(arg1);
        },
        __wbg_set_onmessage_5c487e2bc6858454: function(arg0, arg1) {
            getObject(arg0).onmessage = getObject(arg1);
        },
        __wbg_set_signal_8c5cf4c3b27bd8a8: function(arg0, arg1) {
            getObject(arg0).signal = getObject(arg1);
        },
        __wbg_set_type_86c28c059175fa05: function(arg0, arg1) {
            getObject(arg0).type = __wbindgen_enum_WorkerType[arg1];
        },
        __wbg_set_type_9cc8db71b8673ad7: function(arg0, arg1, arg2) {
            getObject(arg0).type = getStringFromWasm0(arg1, arg2);
        },
        __wbg_signal_4643ce883b92b553: function(arg0) {
            const ret = getObject(arg0).signal;
            return addHeapObject(ret);
        },
        __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
            const ret = getObject(arg1).stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_static_accessor_GLOBAL_THIS_1c7f1bd6c6941fdb: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_GLOBAL_e039bc914f83e74e: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_SELF_8bf8c48c28420ad5: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_WINDOW_6aeee9b51652ee0f: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_status_157e67ab07d01f8a: function(arg0) {
            const ret = getObject(arg0).status;
            return ret;
        },
        __wbg_storage_78992f104707a253: function(arg0) {
            const ret = getObject(arg0).storage;
            return addHeapObject(ret);
        },
        __wbg_subarray_fbe3cef290e1fa43: function(arg0, arg1, arg2) {
            const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_then_20a157d939b514f5: function(arg0, arg1) {
            const ret = getObject(arg0).then(getObject(arg1));
            return addHeapObject(ret);
        },
        __wbg_then_5ef9b762bc91555c: function(arg0, arg1, arg2) {
            const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        },
        __wbg_toString_7fbc0abf5c3327f5: function() { return handleError(function (arg0, arg1) {
            const ret = getObject(arg0).toString(arg1);
            return addHeapObject(ret);
        }, arguments); },
        __wbg_toString_9ae74d2321992740: function(arg0) {
            const ret = getObject(arg0).toString();
            return addHeapObject(ret);
        },
        __wbg_truncate_1294f1d4ce528cec: function() { return handleError(function (arg0, arg1) {
            getObject(arg0).truncate(arg1 >>> 0);
        }, arguments); },
        __wbg_truncate_6d72f826b55029bb: function() { return handleError(function (arg0, arg1) {
            getObject(arg0).truncate(arg1);
        }, arguments); },
        __wbg_url_a0e994e7d0317efc: function(arg0, arg1) {
            const ret = getObject(arg1).url;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_value_f852716acdeb3e82: function(arg0) {
            const ret = getObject(arg0).value;
            return addHeapObject(ret);
        },
        __wbg_versions_276b2795b1c6a219: function(arg0) {
            const ret = getObject(arg0).versions;
            return addHeapObject(ret);
        },
        __wbg_warn_d258f6e2da5e0422: function(arg0, arg1, arg2, arg3) {
            console.warn(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
        },
        __wbg_write_2c5b749b7c262563: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).write(getObject(arg1), getObject(arg2));
            return ret;
        }, arguments); },
        __wbg_write_b1d4179946839909: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).write(getArrayU8FromWasm0(arg1, arg2), getObject(arg3));
            return ret;
        }, arguments); },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 40, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_816);
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [NamedExternref("MessageEvent")], shim_idx: 3, ret: Unit, inner_ret: Some(Unit) }, mutable: false }) -> Externref`.
            const ret = makeClosure(arg0, arg1, __wasm_bindgen_func_elem_3513);
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000003: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [], shim_idx: 28, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_610);
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000004: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000005: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
            const ret = getArrayU8FromWasm0(arg0, arg1);
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000006: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000007: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
            return addHeapObject(ret);
        },
        __wbindgen_object_clone_ref: function(arg0) {
            const ret = getObject(arg0);
            return addHeapObject(ret);
        },
        __wbindgen_object_drop_ref: function(arg0) {
            takeObject(arg0);
        },
    };
    return {
        __proto__: null,
        "./storage-worker_bg.js": import0,
    };
}

function __wasm_bindgen_func_elem_610(arg0, arg1) {
    wasm.__wasm_bindgen_func_elem_610(arg0, arg1);
}

function __wasm_bindgen_func_elem_3513(arg0, arg1, arg2) {
    wasm.__wasm_bindgen_func_elem_3513(arg0, arg1, addHeapObject(arg2));
}

function __wasm_bindgen_func_elem_816(arg0, arg1, arg2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.__wasm_bindgen_func_elem_816(retptr, arg0, arg1, addHeapObject(arg2));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function __wasm_bindgen_func_elem_890(arg0, arg1, arg2, arg3) {
    wasm.__wasm_bindgen_func_elem_890(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}


const __wbindgen_enum_RequestCache = ["default", "no-store", "reload", "no-cache", "force-cache", "only-if-cached"];


const __wbindgen_enum_RequestCredentials = ["omit", "same-origin", "include"];


const __wbindgen_enum_RequestMode = ["same-origin", "no-cors", "cors", "navigate"];


const __wbindgen_enum_WorkerType = ["classic", "module"];
const ConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_config_free(ptr, 1));
const MainThreadHandleFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_mainthreadhandle_free(ptr, 1));
const TrapFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_trap_free(ptr, 1));
const WebClientFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_webclient_free(ptr, 1));

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => wasm.__wbindgen_export5(state.a, state.b));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function dropObject(idx) {
    if (idx < 1028) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getObject(idx) { return heap[idx]; }

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_export3(addHeapObject(e));
    }
}

let heap = new Array(1024).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        try {
            return f(state.a, state.b, ...args);
        } finally {
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_export5(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function makeMutClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_export5(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('storage-worker_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
