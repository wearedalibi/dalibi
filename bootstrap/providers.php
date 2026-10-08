<?php

use App\Providers\AppServiceProvider;
use App\Providers\FileStorageServiceProvider;
use App\Providers\FortifyServiceProvider;

return [
    AppServiceProvider::class,
    FortifyServiceProvider::class,
    FileStorageServiceProvider::class,
];
