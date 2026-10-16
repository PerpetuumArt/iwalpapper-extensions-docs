// Silk Waves: a few layers of sine folds, warped by each other. Written as on Shadertoy.

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime * 0.12;
    vec2 p = uv * 2.2;
    for (int i = 1; i < 5; i++) {
        float f = float(i);
        p += vec2(0.55 / f * sin(f * p.y + t + 0.3 * f), 0.45 / f * cos(f * p.x + t * 0.8 - 0.2 * f));
    }
    float fold = 0.5 + 0.5 * sin(p.x + p.y);
    vec3 deep = vec3(0.06, 0.08, 0.22);
    vec3 rose = vec3(0.86, 0.36, 0.52);
    vec3 dawn = vec3(0.98, 0.78, 0.55);
    vec3 color = mix(deep, rose, smoothstep(0.15, 0.75, fold));
    color = mix(color, dawn, smoothstep(0.7, 1.0, fold) * 0.6);
    color *= 0.85 + 0.15 * sin(p.y * 1.7 - t);
    fragColor = vec4(color, 1.0);
}
