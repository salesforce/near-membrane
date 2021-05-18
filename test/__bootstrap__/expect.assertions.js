import "jasmine-expect-count";

beforeAll(() => {
  expect.assertions = jasmine.expectCount;
});