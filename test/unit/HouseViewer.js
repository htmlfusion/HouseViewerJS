import houseViewerJs from '../../src/HouseViewer';

describe('houseViewerJs', () => {
  describe('Greet function', () => {
    beforeEach(() => {
      spy(HouseViewer, 'greet');
      HouseViewer.greet();
    });

    it('should have been run once', () => {
      expect(HouseViewer.greet).to.have.been.calledOnce;
    });

    it('should have always returned hello', () => {
      expect(HouseViewer.greet).to.have.always.returned('hello');
    });
  });
});
