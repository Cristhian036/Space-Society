const {test} = require('node:test');
const assert = require('node:assert/strict');
const {clipLineToPolygons: clip, pointInPolygon} = require('../js/river-geometry');
const box = [[0,0],[0,1],[1,1],[1,0]];
function near(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((part,i) => {
    assert.equal(part.length,expected[i].length);
    part.forEach((p,j) => p.forEach((v,k) => assert.ok(Math.abs(v-expected[i][j][k])<1e-8)));
  });
}
test('crossing with both endpoints outside', () => near(clip([[.5,-1],[.5,2]],[box]),[[[.5,0],[.5,1]]]));
test('entering and exiting segments keep boundary intersections', () => {
  near(clip([[.5,-1],[.5,.5]],[box]),[[[.5,0],[.5,.5]]]);
  near(clip([[.5,.5],[.5,2]],[box]),[[[.5,.5],[.5,1]]]);
});
test('joins consecutive interior edges', () => near(clip([[.5,-1],[.5,.4],[.5,2]],[box]),[[[.5,0],[.5,.4],[.5,1]]]));
test('closed ring does not classify every point as boundary', () => {
  assert.equal(pointInPolygon([2,2],[...box,box[0]]),false);
  assert.equal(pointInPolygon([0,.5],box),true);
});
test('overlapping swaths form one continuous line', () => {
  const b=box.map(p=>[p[0],p[1]+.5]);
  const result=clip([[.5,-1],[.5,3]],[box,b]);
  assert.equal(result.length,1);
  near([[result[0][0],result[0].at(-1)]],[[[.5,0],[.5,1.5]]]);
});
test('disjoint swaths preserve missing coverage', () => {
  const b=box.map(p=>[p[0],p[1]+2]);
  near(clip([[.5,-1],[.5,4]],[box,b]),[[[.5,0],[.5,1]],[[.5,2],[.5,3]]]);
});
test('collinear boundary retained, tangent corner has no zero length line', () => {
  near(clip([[0,-1],[0,2]],[box]),[[[0,0],[0,1]]]);
  assert.deepEqual(clip([[-1,1],[1,-1]],[box]),[]);
});
test('concave polygon produces separate pieces', () => {
  const u=[[0,0],[3,0],[3,1],[1,1],[1,2],[3,2],[3,3],[0,3]];
  near(clip([[2,-1],[2,4]],[u]),[[[2,0],[2,1]],[[2,2],[2,3]]]);
});
test('NoData, duplicates, outside and absent coverage', () => {
  assert.deepEqual(clip([[.5,0],[NaN,.5],[.5,1]],[box]),[]);
  near(clip([[.5,0],[.5,0],[.5,1]],[box]),[[[.5,0],[.5,1]]]);
  assert.deepEqual(clip([[2,0],[2,1]],[box]),[]);
  assert.deepEqual(clip([[0,0],[1,1]],[]),[]);
});
