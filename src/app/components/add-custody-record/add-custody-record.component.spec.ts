import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddCustodyRecordComponent } from './add-custody-record.component';

describe('AddCustodyRecordComponent', () => {
  let component: AddCustodyRecordComponent;
  let fixture: ComponentFixture<AddCustodyRecordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddCustodyRecordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddCustodyRecordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
