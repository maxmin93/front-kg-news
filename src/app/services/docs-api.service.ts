import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, forkJoin } from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';

import { NewsConfig } from '../app.config';


@Injectable({
  providedIn: 'root'
})
export class DocsApiService {

    // URL to web api
    private api_url = NewsConfig.URL + '/docs';

    constructor(private http: HttpClient) { }


    ///////////////////////////////////////////////////////
    //  Doc2Vec
    //

    // http://localhost:8888/docs/doc2vec/D67273415
    getDoc2Vec(docid:string): Observable<any>{
        let url = `${this.api_url}/doc2vec/${docid}`;
        return this.http.get<any>(url);
    }



}
