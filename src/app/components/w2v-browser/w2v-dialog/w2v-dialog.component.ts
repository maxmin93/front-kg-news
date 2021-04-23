import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-w2v-dialog',
  templateUrl: './w2v-dialog.component.html',
  styleUrls: ['./w2v-dialog.component.scss']
})
export class W2vDialogComponent implements OnInit {

    constructor(
        public dialogRef: MatDialogRef<W2vDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) { }

    ngOnInit(): void {
    }

    selectNoun(label: string, noun: string){
        this.dialogRef.close({
            label: label,
            noun: noun
        });
    }
}
