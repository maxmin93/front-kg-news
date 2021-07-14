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
    getDoc2Vec(docid:string, mode:string): Observable<any>{
        let url = `${this.api_url}/doc2vec/${mode}/${docid}`;
        return this.http.get<any>(url);
    }


    ///////////////////////////////////////////////////////
    //  Doc2Graph
    //

    // http://localhost:8888/api/docs/dgraph/D67113626
    getDgraphDoc(docid:string): Observable<any>{
        let url = `${this.api_url}/dgraph/${docid}/full`;
        return this.http.get<any>(url);
    }

    getDgraphDocSimplified(docid:string): Observable<any>{
        let url = `${this.api_url}/dgraph/${docid}/simple?labeled=True`;
        return this.http.get<any>(url);
    }

    // http://localhost:8888/api/docs/dgraph/D67113626/subgraph/28
    getDgraphDocSub(docid:string, idx:string, pruned:boolean): Observable<any>{
        let url = `${this.api_url}/dgraph/${docid}/subgraph/${idx}?pruned=${pruned}`;
        return this.http.get<any>(url);
    }

    // http://localhost:8888/api/docs/dgraph/D67113626/subgraphs
    getDgraphDocSubAll(docid:string): Observable<any>{
        let url = `${this.api_url}/dgraph/${docid}/subgraphs`;
        return this.http.get<any>(url);
    }


    ///////////////////////////////////////////////////////
    //  DocTriples
    //

    // http://localhost:8888/api/docs/dgraph/D67113626/triples
    getDocTriples(docid:string): Observable<any>{
        let url = `${this.api_url}/dgraph/${docid}/triples`;
        return this.http.get<any>(url);
    }

    // http://localhost:8888/api/docs/dgraph/D67113626/triples
    getQryTriples(qry:string): Observable<any>{
        let url = `${this.api_url}/query/triples?q=${encodeURI(qry)}`;
        return this.http.get<any>(url);
    }

}
