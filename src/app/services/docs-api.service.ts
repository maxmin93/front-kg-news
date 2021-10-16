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

    // http://localhost:28888/api/docs/tgraph/docid/D67113626
    getTriplesGraphByDocid(docid:string): Observable<any>{
        let url = `${this.api_url}/tgraph/docid/${docid}`;
        return this.http.get<any>(url);
    }

    // http://localhost:28888/api/docs/tgraph/sglist?sg=
    getTriplesGraphBySgList(sglist:string[]): Observable<any>{
        let params = sglist.map(x=>`sg=${x}`);
        let url = `${this.api_url}/tgraph/sglist?${params.join('&')}`;
        return this.http.get<any>(url);
    }

    // http://localhost:28888/api/docs/tgraph/sglist-with-terms?sg=&t=
    getTriplesGraphBySgListWithTerms(sglist:string[], terms:string[]): Observable<any>{
        let params_sglist = sglist.map(x=>`sg=${x}`);
        let params_terms = terms.map(x=>`t=${x}`);
        let url = `${this.api_url}/tgraph/sglist-with-terms?${params_sglist.join('&')}&${params_terms.join('&')}`;
        return this.http.get<any>(url);
    }
    
    // http://localhost:28888/api/docs/tgraph/origin/D67113626
    // getDocTriples(docid:string): Observable<any>{
    //     let url = `${this.api_url}/tgraph/origin/${docid}`;
    //     return this.http.get<any>(url);
    // }

    // http://localhost:28888/api/docs/query/triples?q=
    getQryTriples(qry:string): Observable<any>{
        let url = `${this.api_url}/qgraph/triples?q=${encodeURI(qry)}`;
        return this.http.get<any>(url);
    }

    // http://localhost:28888/api/docs/search/triples?q=
    getResultTriples(qry: string, docid: string): Observable<any>{
        let url = `${this.api_url}/search/triples?docid=${docid}&q=${encodeURI(qry)}`;
        return this.http.get<any>(url);
    }
}
