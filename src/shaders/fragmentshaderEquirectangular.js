var shader = `
#ifdef GL_ES
precision highp float;
#endif

#define tau 6.28318530718

varying vec4 vRstq;
uniform sampler2D projectorTex;
uniform sampler2D projectorTexLow;
uniform float opacity;

void main()
{
  vec3 b = normalize(vRstq.xyz);
  float lat = -asin(b.y);
  float lon = atan(b.x, b.z);
  float x = lon / tau + 0.5;
  float y = lat / tau * 2.0 + 0.5;
  vec4 baseColor = texture2D(projectorTex, vec2(x, y));
  vec4 baseColorLow = texture2D(projectorTexLow, vec2(x, y));
  vec4 merged = baseColor.rgba * baseColor.a + baseColorLow.rgba * baseColorLow.a * (1.0 - baseColor.a);  // blending equation
  merged.a = opacity;
  gl_FragColor = merged;
}
`;

module.exports = shader;
