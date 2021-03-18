import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class WordsApiService {

    // URL to web api
    private api_url = 'http://127.0.0.1:8888/words';

    constructor(private http: HttpClient) { }

    getW2vPivots(): Observable<string[]>{
        let url = `${this.api_url}/w2v/pivots`;
        return this.http.get<string[]>(url);
    }

    getW2vSynonyms(pivot: string, num: number=20): Observable<any[]>{
        let url = `${this.api_url}/w2v/synonyms/${encodeURIComponent(pivot)}?num=${num}`;
        return this.http.get<any[]>(url);
    }

    getW2vGraph(pivot: string, num: number=20): Observable<any>{
        let url = `${this.api_url}/w2v/graph/${encodeURIComponent(pivot)}?num=${num}`;
        return this.http.get<any>(url);
    }

}
