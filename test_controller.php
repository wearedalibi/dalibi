<?php

use App\Http\Controllers\StudentScholarshipController;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Inertia\Response;

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

try {
    echo "Test du contrôleur StudentScholarshipController\n";

    $controller = app(StudentScholarshipController::class);
    $request = new Request;

    $response = $controller->index($request);

    // Vérifier si c'est une réponse Inertia
    if ($response instanceof Response) {
        // Essayer d'accéder aux propriétés directement
        $reflection = new ReflectionClass($response);
        $propsProperty = $reflection->getProperty('props');
        $propsProperty->setAccessible(true);
        $data = $propsProperty->getValue($response);

        echo "Données chargées avec succès\n";
        echo 'Clés disponibles: '.implode(', ', array_keys($data))."\n";

        if (isset($data['studentScholarships'])) {
            echo '- Type de studentScholarships: '.gettype($data['studentScholarships'])."\n";
            if (is_array($data['studentScholarships']) && isset($data['studentScholarships']['data'])) {
                echo '- Attributions: '.count($data['studentScholarships']['data'])."\n";
            }
        }

        if (isset($data['scholarships'])) {
            echo '- Bourses disponibles: '.count($data['scholarships'])."\n";
        }

        if (isset($data['academicYears'])) {
            echo '- Années académiques: '.count($data['academicYears'])."\n";
        }

        if (isset($data['filters'])) {
            echo '- Filtres: '.json_encode($data['filters'])."\n";
        }
    } else {
        echo 'Erreur: réponse inattendue - '.get_class($response)."\n";
    }

} catch (Exception $e) {
    echo 'Erreur: '.$e->getMessage()."\n";
    echo 'Trace: '.$e->getTraceAsString()."\n";
}
