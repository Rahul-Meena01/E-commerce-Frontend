import { jest } from "@jest/globals";

export const createMockModel = (data = {}) => ({
  ...data,
  save: jest.fn().mockResolvedValue(data),
  toObject: jest.fn().mockReturnValue(data),
});

export const createMockQuery = (data) => {
  const query = {
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockImplementation(() => Promise.resolve(data)),
    exec: jest.fn().mockImplementation(() => Promise.resolve(data)),
    then: jest.fn().mockImplementation((resolve) => resolve(data)),
  };
  return query;
};
