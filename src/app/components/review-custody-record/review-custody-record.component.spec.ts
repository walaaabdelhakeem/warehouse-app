import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewCustodyRecordComponent } from './review-custody-record.component';

describe('ReviewCustodyRecordComponent', () => {
  let component: ReviewCustodyRecordComponent;
  let fixture: ComponentFixture<ReviewCustodyRecordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewCustodyRecordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewCustodyRecordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
