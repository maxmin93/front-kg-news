import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-vocab-dialog',
  templateUrl: './vocab-dialog.component.html',
  styleUrls: ['./vocab-dialog.component.scss']
})
export class VocabDialogComponent implements OnInit {

    constructor(
        public dialogRef: MatDialogRef<VocabDialogComponent>,
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
