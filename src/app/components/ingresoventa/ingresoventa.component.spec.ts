import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IngresoventaComponent } from './ingresoventa.component';

describe('IngresoventaComponent', () => {
  let component: IngresoventaComponent;
  let fixture: ComponentFixture<IngresoventaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [IngresoventaComponent]
    });
    fixture = TestBed.createComponent(IngresoventaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
