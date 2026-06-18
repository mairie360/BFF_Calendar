/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckApiResponse } from '../models/CheckApiResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ConnectivityService {
    /**
     * Vérifie la connexion avec l'API Core et Calendar (Rust)
     * @returns CheckApiResponse Connexion réussie
     * @throws ApiError
     */
    public static getCheckApis(): CancelablePromise<CheckApiResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/check_apis',
            errors: {
                502: `API Core injoignable`,
            },
        });
    }
    /**
     * Vérifie la santé du BFF
     * @returns any OK
     * @throws ApiError
     */
    public static getHealth(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health',
        });
    }
}
