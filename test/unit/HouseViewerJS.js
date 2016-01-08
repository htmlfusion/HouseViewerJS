import houseViewerJs from '../../src/HouseViewerJS';

describe('houseViewerJs', () => {
  describe('Greet function', () => {
    beforeEach(() => {
      spy(houseViewerJs, 'greet');
      houseViewerJs.greet();
    });

    it('should have been run once', () => {
      expect(houseViewerJs.greet).to.have.been.calledOnce;
    });

    it('should have always returned hello', () => {
      expect(houseViewerJs.greet).to.have.always.returned('hello');
    });
  });
});
